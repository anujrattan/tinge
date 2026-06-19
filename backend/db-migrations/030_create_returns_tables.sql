-- Migration: Returns system — return_requests, return_status_history, orders.delivered_at
-- Date: 2026

-- Add delivered_at to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN orders.delivered_at IS 'Timestamp when order was marked delivered (used for return window)';

-- Expand payment_status on orders to include partially_refunded
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded'));

-- Expand payments.status to include partially_refunded
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('created', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded'));

-- Return requests
CREATE TABLE IF NOT EXISTS return_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_number VARCHAR(50) UNIQUE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('refund', 'exchange')),
  status VARCHAR(30) NOT NULL DEFAULT 'pending_review' CHECK (status IN (
    'pending_review', 'approved', 'rejected', 'awaiting_shipment',
    'in_transit', 'received', 'completed', 'cancelled'
  )),
  reason VARCHAR(50) NOT NULL CHECK (reason IN (
    'defective', 'wrong_item', 'wrong_size', 'changed_mind', 'other'
  )),
  reason_detail TEXT,
  exchange_size TEXT,
  exchange_color TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  refund_amount DECIMAL(10, 2),
  photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  admin_notes TEXT,
  partner_claim_ref TEXT,
  partner_filed BOOLEAN NOT NULL DEFAULT false,
  rejection_reason TEXT,
  return_ship_to TEXT,
  return_ship_instructions TEXT,
  manual_refund_ref TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by_email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_return_requests_order_id ON return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_order_item_id ON return_requests(order_item_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON return_requests(status);
CREATE INDEX IF NOT EXISTS idx_return_requests_return_number ON return_requests(return_number);
CREATE INDEX IF NOT EXISTS idx_return_requests_created_at ON return_requests(created_at);

-- Return status history (audit)
CREATE TABLE IF NOT EXISTS return_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_request_id UUID NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
  old_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL,
  changed_by_email VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_return_status_history_return_id ON return_status_history(return_request_id);

ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage all return requests" ON return_requests
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all return status history" ON return_status_history
  FOR ALL USING (auth.role() = 'service_role');
