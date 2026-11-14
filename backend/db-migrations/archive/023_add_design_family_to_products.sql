-- Add optional design family grouping key for hybrid color experience.
-- This allows multiple single-color products to be linked as sibling colorways.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS design_family TEXT;

COMMENT ON COLUMN products.design_family IS
  'Optional grouping key to link same design across color-specific products.';

