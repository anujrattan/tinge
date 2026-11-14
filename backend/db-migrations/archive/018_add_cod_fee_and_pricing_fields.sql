-- Migration: Add COD Fee to Orders and Pricing Fields to Products
-- Description: Adds cod_fee column to orders table for Cash on Delivery handling charges,
--              and adds vendor/pricing fields to products table for margin analytics.
-- Date: 2026-01-27

-- 1) Add cod_fee to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cod_fee DECIMAL(10, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN orders.cod_fee IS 'Cash on Delivery handling fee charged to customer for this order';

-- 2) Add pricing fields to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS vendor_base_cost DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS vendor_shipping_cost DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS target_margin_percent DECIMAL(5, 2) DEFAULT 100
    CHECK (target_margin_percent >= 0 AND target_margin_percent <= 1000);

COMMENT ON COLUMN products.vendor_base_cost IS 'Base cost charged by fulfillment/vendor for the product (excluding shipping)';
COMMENT ON COLUMN products.vendor_shipping_cost IS 'Shipping cost charged by fulfillment/vendor for this product';
COMMENT ON COLUMN products.target_margin_percent IS 'Target gross margin percentage over (vendor_base_cost + vendor_shipping_cost). Default 100% (2x cost).';

