-- Migration: Add tracking information to orders table
-- Description: Adds shipping partner, tracking number, and tracking URL columns for order tracking
-- Date: 2026-01-12

-- Add shipping_partner column (e.g., "FedEx", "DHL", "BlueDart", "Delhivery")
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shipping_partner VARCHAR(100);

-- Add tracking_number column (tracking number provided by shipping partner)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(255);

-- Add tracking_url column (full tracking URL from shipping partner)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS tracking_url TEXT;

-- Create index for tracking number lookups
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON orders(tracking_number);

-- Create index for shipping partner lookups
CREATE INDEX IF NOT EXISTS idx_orders_shipping_partner ON orders(shipping_partner);

-- Comments for documentation
COMMENT ON COLUMN orders.shipping_partner IS 'Name of the shipping partner/courier service (e.g., FedEx, DHL, BlueDart, Delhivery)';
COMMENT ON COLUMN orders.tracking_number IS 'Shipping tracking number provided by the shipping partner';
COMMENT ON COLUMN orders.tracking_url IS 'Full tracking URL from the shipping partner for easy access';
