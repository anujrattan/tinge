-- Migration: Add Mockup Images to Product Variants
-- Description: Adds mockup_images column to store color-specific mockup images
-- Date: 2024

-- Add mockup_images JSONB column to product_variants table
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS mockup_images JSONB DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN product_variants.mockup_images IS 'Array of mockup image URLs specific to this color variant (e.g., ["url1", "url2"])';

-- Create GIN index for faster queries on mockup_images array
CREATE INDEX IF NOT EXISTS idx_product_variants_mockup_images ON product_variants USING GIN (mockup_images);

