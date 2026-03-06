-- Migration: Create Products Table
-- Description: Creates the products table with foreign key to categories
-- Date: 2024

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  selling_price DECIMAL(10, 2) NOT NULL,
  discount_percentage DECIMAL(5, 2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  usp_tag TEXT,
  main_image_url TEXT NOT NULL,
  mockup_images JSONB DEFAULT '[]'::jsonb,
  mockup_video_url TEXT,
  rating DECIMAL(3, 2) CHECK (rating >= 0 AND rating <= 5),
  review_count INTEGER DEFAULT 0 CHECK (review_count >= 0),
  variants JSONB DEFAULT '{"sizes": [], "colors": []}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on category_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- Create index on title for search
CREATE INDEX IF NOT EXISTS idx_products_title ON products(title);

-- Create index on selling_price for sorting
CREATE INDEX IF NOT EXISTS idx_products_selling_price ON products(selling_price);

-- Create index on discount_percentage for filtering sale items
CREATE INDEX IF NOT EXISTS idx_products_discount ON products(discount_percentage) WHERE discount_percentage > 0;

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public read, service role write

-- Allow everyone to read products
CREATE POLICY "Products are viewable by everyone" ON products
  FOR SELECT USING (true);

-- Allow service role to insert products
CREATE POLICY "Products are insertable by service role" ON products
  FOR INSERT WITH CHECK (true);

-- Allow service role to update products
CREATE POLICY "Products are updatable by service role" ON products
  FOR UPDATE USING (true);

-- Allow service role to delete products
CREATE POLICY "Products are deletable by service role" ON products
  FOR DELETE USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();

-- Add comment to table
COMMENT ON TABLE products IS 'Stores products linked to categories via foreign key';

-- Add comment to columns
COMMENT ON COLUMN products.category_id IS 'Foreign key reference to categories table';
COMMENT ON COLUMN products.selling_price IS 'Original selling price before discount';
COMMENT ON COLUMN products.discount_percentage IS 'Discount percentage (0-100). Discounted price = selling_price * (1 - discount_percentage/100)';
COMMENT ON COLUMN products.usp_tag IS 'Unique Selling Proposition tag (e.g., "100% organic cotton")';
COMMENT ON COLUMN products.main_image_url IS 'Main product image displayed in catalog';
COMMENT ON COLUMN products.mockup_images IS 'Array of mockup image URLs (max 4)';
COMMENT ON COLUMN products.mockup_video_url IS 'Optional video URL for product showcase';

