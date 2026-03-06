-- Migration: Create Order Status History Table
-- Description: Creates table to track order status changes for audit logging
-- Date: 2024

-- Create order_status_history table
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_name VARCHAR(255), -- Store name for reference even if user is deleted
  notes TEXT, -- Optional notes/comments about the status change
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_by ON order_status_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON order_status_history(created_at);
CREATE INDEX IF NOT EXISTS idx_order_status_history_new_status ON order_status_history(new_status);

-- Enable Row Level Security
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Service role can manage all, users can view their own order history
CREATE POLICY "Service role can manage all order status history" ON order_status_history
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view status history for their orders" ON order_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      JOIN users ON users.id = orders.user_id
      WHERE orders.id = order_status_history.order_id 
      AND (users.auth_user_id = auth.uid() OR auth.role() = 'service_role')
    ) OR auth.role() = 'service_role'
  );

-- Comments
COMMENT ON TABLE order_status_history IS 'Audit log table tracking all order status changes';
COMMENT ON COLUMN order_status_history.old_status IS 'Previous status before change (NULL for initial status)';
COMMENT ON COLUMN order_status_history.new_status IS 'New status after change';
COMMENT ON COLUMN order_status_history.changed_by IS 'User ID who made the change (admin)';
COMMENT ON COLUMN order_status_history.changed_by_name IS 'Name of the user who made the change (for reference)';
COMMENT ON COLUMN order_status_history.notes IS 'Optional notes or comments about the status change';

