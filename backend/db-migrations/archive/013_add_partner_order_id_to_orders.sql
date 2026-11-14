-- Migration: Add Partner Order ID Field to Orders Table
-- Description: Adds partner_order_id column to store the order ID from the fulfillment partner platform
-- Date: 2024
-- Note: This stores the order ID returned by the fulfillment partner (e.g., Qikink order ID, Printrove order ID)

-- Add partner_order_id column to orders table
-- NULL allowed - order may not have been created on partner platform yet
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS partner_order_id VARCHAR(255);

-- Create index for faster filtering and queries
CREATE INDEX IF NOT EXISTS idx_orders_partner_order_id ON orders(partner_order_id);

-- Add column comment for documentation
COMMENT ON COLUMN orders.partner_order_id IS 'Order ID from the fulfillment partner platform (e.g., Qikink order ID, Printrove order ID). This is set after creating the order with the fulfillment partner.';

