-- Migration: Create Product Variants Table
-- Description: Creates the product_variants table to store Gelato variant IDs mapped to products
-- Date: 2024

-- Create product_variants table
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  gelato_variant_id TEXT NOT NULL,
  gelato_product_id TEXT NOT NULL,
  variant_data JSONB DEFAULT '{}'::jsonb, -- Store variant-specific data (size, color, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, gelato_variant_id)
);

-- Create index on product_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);

-- Create index on gelato_variant_id for lookups
CREATE INDEX IF NOT EXISTS idx_product_variants_gelato_variant_id ON product_variants(gelato_variant_id);

-- Create index on gelato_product_id
CREATE INDEX IF NOT EXISTS idx_product_variants_gelato_product_id ON product_variants(gelato_product_id);

-- Enable Row Level Security
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public read, service role write
CREATE POLICY "Product variants are viewable by everyone" ON product_variants
  FOR SELECT USING (true);

CREATE POLICY "Product variants are insertable by service role" ON product_variants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Product variants are updatable by service role" ON product_variants
  FOR UPDATE USING (true);

CREATE POLICY "Product variants are deletable by service role" ON product_variants
  FOR DELETE USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_variants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_product_variants_updated_at();

-- Add comments
COMMENT ON TABLE product_variants IS 'Stores Gelato variant IDs mapped to local products';
COMMENT ON COLUMN product_variants.product_id IS 'Foreign key reference to products table';
COMMENT ON COLUMN product_variants.gelato_variant_id IS 'Variant ID from Gelato API';
COMMENT ON COLUMN product_variants.gelato_product_id IS 'Product ID from Gelato API';
COMMENT ON COLUMN product_variants.variant_data IS 'JSONB field for variant-specific metadata (size, color, etc.)';

