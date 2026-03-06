-- Migration: Add Fulfillment Partner Field to Orders Table
-- Description: Adds fulfillment_partner column to orders table for tracking which partner handles fulfillment
-- Date: 2024
-- Note: Currently supports Qikink and Printrove (India). Designed to be scalable for future country-wise partners.

-- Add fulfillment_partner column to orders table
-- NULL allowed - orders may not have a partner assigned initially
-- CHECK constraint allows current partners and can be expanded later
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS fulfillment_partner VARCHAR(50) CHECK (fulfillment_partner IS NULL OR fulfillment_partner IN ('Qikink', 'Printrove'));

-- Create index for faster filtering and queries
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_partner ON orders(fulfillment_partner);

-- Add column comment for documentation
COMMENT ON COLUMN orders.fulfillment_partner IS 'Fulfillment partner for this order. Currently supports Qikink and Printrove (India). Can be expanded for global partners.';

-- Note: To add more fulfillment partners in the future, use:
-- ALTER TABLE orders DROP CONSTRAINT orders_fulfillment_partner_check;
-- ALTER TABLE orders ADD CONSTRAINT orders_fulfillment_partner_check 
--   CHECK (fulfillment_partner IS NULL OR fulfillment_partner IN ('Qikink', 'Printrove', 'PartnerName1', 'PartnerName2', ...));

