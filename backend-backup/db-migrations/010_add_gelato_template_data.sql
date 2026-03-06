-- Migration: Add Gelato Template Data Fields
-- Description: Adds fields to store Gelato template metadata and preview URL
-- Date: 2024

-- Add gelato_template_data JSONB field to store full template metadata
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS gelato_template_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS gelato_preview_url TEXT;

-- Create index on gelato_template_data for faster queries (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_products_gelato_template_data ON products USING GIN (gelato_template_data);

-- Add comments
COMMENT ON COLUMN products.gelato_template_data IS 'Full template metadata from Gelato API including templateName, imagePlaceholders, textPlaceholders, etc.';
COMMENT ON COLUMN products.gelato_preview_url IS 'Preview image URL from Gelato template (for admin reference only)';

