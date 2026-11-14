-- Migration: Remove Product Variants Table and Simplify Schema
-- Description: Removes product_variants table and variant_id from order_items since we only need product_id + size + color
-- Date: 2024

-- Step 1: Remove variant_id column from order_items table (if exists)
-- We already have product_id, size, and color which is all we need for manual fulfillment
ALTER TABLE order_items
  DROP COLUMN IF EXISTS variant_id;

-- Step 2: Drop the index on variant_id if it exists
DROP INDEX IF EXISTS idx_order_items_variant_id;

-- Step 3: Drop product_variants table (variants are stored in products.variants JSONB)
DROP TABLE IF EXISTS product_variants CASCADE;

-- Step 4: Add comment to order_items for clarity
COMMENT ON COLUMN order_items.product_id IS 'Product ID from products table';
COMMENT ON COLUMN order_items.size IS 'Size of the ordered item (e.g., S, M, L, XL)';
COMMENT ON COLUMN order_items.color IS 'Color of the ordered item (e.g., Black, White, #FF0000)';
COMMENT ON TABLE order_items IS 'Order line items. Contains product_id, size, and color for manual fulfillment. Variants stored in products.variants JSONB.';

