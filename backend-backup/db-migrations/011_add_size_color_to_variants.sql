-- Migration: Add Size and Color Columns to Product Variants
-- Description: Adds separate size and color columns for easier querying and filtering
-- Date: 2024

-- Add size and color columns to product_variants table
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS size TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT;

-- Create indexes for faster queries by size and color
CREATE INDEX IF NOT EXISTS idx_product_variants_size ON product_variants(size);
CREATE INDEX IF NOT EXISTS idx_product_variants_color ON product_variants(color);

-- Create composite index for size + color queries
CREATE INDEX IF NOT EXISTS idx_product_variants_size_color ON product_variants(product_id, size, color);

-- Add comments
COMMENT ON COLUMN product_variants.size IS 'Size extracted from Gelato variant (e.g., S, M, L, XL)';
COMMENT ON COLUMN product_variants.color IS 'Color extracted from Gelato variant (e.g., White, Black, Navy Blue)';

-- Backfill existing data: Extract size and color from variant_data JSONB
-- This will populate size and color columns from existing variant_data
UPDATE product_variants
SET 
  size = CASE 
    WHEN variant_data->>'size' IS NOT NULL THEN variant_data->>'size'
    WHEN variant_data->'variantOptions' IS NOT NULL THEN
      (SELECT option->>'value'
       FROM jsonb_array_elements(variant_data->'variantOptions') AS option
       WHERE LOWER(option->>'name') = 'size'
       LIMIT 1)
    ELSE NULL
  END,
  color = CASE 
    WHEN variant_data->>'color' IS NOT NULL THEN variant_data->>'color'
    WHEN variant_data->'variantOptions' IS NOT NULL THEN
      (SELECT option->>'value'
       FROM jsonb_array_elements(variant_data->'variantOptions') AS option
       WHERE LOWER(option->>'name') IN ('color', 'colour')
       LIMIT 1)
    ELSE NULL
  END
WHERE size IS NULL OR color IS NULL;

