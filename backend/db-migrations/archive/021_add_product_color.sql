-- Migration: Add color column to products (one listing per color)
-- Description: Each product listing has a single color. Variants contain sizes only.
-- Date: 2025

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS color TEXT;

-- Ensure mockup_images exists on products (single set per listing)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS mockup_images JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN products.color IS 'Product color (name or hex). One listing per color.';
COMMENT ON COLUMN products.mockup_images IS 'Mockup image URLs for this listing (one set per product).';
