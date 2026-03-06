-- Migration: Add Fulfillment Partner Fields to Products Table
-- Description: Adds fulfillment partner selection and partner product ID/SKU to products table
-- Date: 2024

-- Step 1: Add fulfillment_partner column to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS fulfillment_partner VARCHAR(50) CHECK (fulfillment_partner IN ('Qikink', 'Printrove'));

-- Step 2: Add partner_product_id column to products table
-- This stores the product ID or SKU from the fulfillment partner platform
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS partner_product_id TEXT;

-- Step 3: Create index on fulfillment_partner for faster filtering
CREATE INDEX IF NOT EXISTS idx_products_fulfillment_partner ON products(fulfillment_partner);

-- Step 4: Add column comments for documentation
COMMENT ON COLUMN products.fulfillment_partner IS 'Fulfillment partner for this product: Qikink or Printrove';
COMMENT ON COLUMN products.partner_product_id IS 'Product ID or SKU from the fulfillment partner platform (e.g., Qikink product ID or Printrove product ID)';

