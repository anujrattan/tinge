-- Migration: Add Sale Fields to Products Table
-- Description: Adds on_sale boolean and sale_discount_percentage fields for sale items
-- Date: 2024

-- Add on_sale boolean field
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS on_sale BOOLEAN DEFAULT FALSE;

-- Add sale_discount_percentage field
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sale_discount_percentage DECIMAL(5, 2) DEFAULT 0 
CHECK (sale_discount_percentage >= 0 AND sale_discount_percentage <= 100);

-- Create index on on_sale for faster filtering of sale items
CREATE INDEX IF NOT EXISTS idx_products_on_sale ON products(on_sale) WHERE on_sale = TRUE;

-- Add comment to columns
COMMENT ON COLUMN products.on_sale IS 'Boolean flag indicating if product is on sale';
COMMENT ON COLUMN products.sale_discount_percentage IS 'Additional discount percentage applied when on_sale is true. Stacks multiplicatively with discount_percentage';

