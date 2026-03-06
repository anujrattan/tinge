-- Migration: Setup Product Variants for Color-Specific Mockup Images
-- Description: Ensures product_variants table has all necessary columns for storing mockup images by color
-- Date: 2024

-- Step 1: Create product_variants table if it doesn't exist
-- Note: If you're using Gelato, you might already have this table with gelato_variant_id columns
-- This migration uses IF NOT EXISTS to be safe
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add size and color columns if they don't exist
-- These columns are essential for grouping variants by color for mockup images
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS size TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT;

-- Step 3: Add mockup_images JSONB column if it doesn't exist
-- This stores color-specific mockup image URLs
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS mockup_images JSONB DEFAULT '[]'::jsonb;

-- Step 4: Create indexes for faster queries
-- Index on product_id (likely already exists, but safe to create)
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);

-- Index on color for fast color-based queries (used in storeMockupImagesByColor)
CREATE INDEX IF NOT EXISTS idx_product_variants_color ON product_variants(color);

-- Index on size for filtering
CREATE INDEX IF NOT EXISTS idx_product_variants_size ON product_variants(size);

-- Composite index for product_id + color queries (optimizes UPDATE queries)
CREATE INDEX IF NOT EXISTS idx_product_variants_product_color ON product_variants(product_id, color);

-- GIN index for mockup_images JSONB array queries (if needed for searching)
CREATE INDEX IF NOT EXISTS idx_product_variants_mockup_images ON product_variants USING GIN (mockup_images);

-- Step 5: Add column comments for documentation
COMMENT ON COLUMN product_variants.size IS 'Size of the variant (e.g., S, M, L, XL, XXL)';
COMMENT ON COLUMN product_variants.color IS 'Color of the variant (e.g., Red, Blue, White). Used to group variants for shared mockup images.';
COMMENT ON COLUMN product_variants.mockup_images IS 'Array of mockup image URLs specific to this color variant. All variants with the same color share the same mockup_images array (e.g., ["url1", "url2", "url3"]).';

-- Step 6: Enable Row Level Security if not already enabled
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies if they don't exist
-- Public read access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_variants' 
    AND policyname = 'Product variants are viewable by everyone'
  ) THEN
    CREATE POLICY "Product variants are viewable by everyone" ON product_variants
      FOR SELECT USING (true);
  END IF;
END $$;

-- Service role insert access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_variants' 
    AND policyname = 'Product variants are insertable by service role'
  ) THEN
    CREATE POLICY "Product variants are insertable by service role" ON product_variants
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Service role update access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_variants' 
    AND policyname = 'Product variants are updatable by service role'
  ) THEN
    CREATE POLICY "Product variants are updatable by service role" ON product_variants
      FOR UPDATE USING (true);
  END IF;
END $$;

-- Service role delete access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_variants' 
    AND policyname = 'Product variants are deletable by service role'
  ) THEN
    CREATE POLICY "Product variants are deletable by service role" ON product_variants
      FOR DELETE USING (true);
  END IF;
END $$;

-- Step 8: Create trigger function for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_product_variants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create trigger for updated_at if it doesn't exist
DROP TRIGGER IF EXISTS update_product_variants_updated_at ON product_variants;
CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_product_variants_updated_at();

