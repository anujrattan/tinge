-- Migration: Add Gelato Fields to Products Table
-- Description: Adds Gelato-specific fields to products table
-- Date: 2024

-- Add Gelato fields to products table
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS gelato_product_id TEXT,
  ADD COLUMN IF NOT EXISTS gelato_template_id TEXT,
  ADD COLUMN IF NOT EXISTS gelato_design_urls JSONB DEFAULT '[]'::jsonb, -- Array of design file URLs
  ADD COLUMN IF NOT EXISTS gelato_status TEXT; -- publishing, active, etc.

-- Create index on gelato_product_id for lookups
CREATE INDEX IF NOT EXISTS idx_products_gelato_product_id ON products(gelato_product_id);

-- Create index on gelato_template_id
CREATE INDEX IF NOT EXISTS idx_products_gelato_template_id ON products(gelato_template_id);

-- Add comments
COMMENT ON COLUMN products.gelato_product_id IS 'Product ID returned from Gelato API after creation';
COMMENT ON COLUMN products.gelato_template_id IS 'Template ID used to create the product in Gelato';
COMMENT ON COLUMN products.gelato_design_urls IS 'Array of design file URLs sent to Gelato';
COMMENT ON COLUMN products.gelato_status IS 'Product status from Gelato (publishing, active, etc.)';

