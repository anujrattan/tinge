-- Migration: Create Order Sequences Table
-- Description: Creates a table to track order number sequences per date for reliable, atomic order number generation
-- Date: 2024

-- Create order_sequences table
CREATE TABLE IF NOT EXISTS order_sequences (
  date_key VARCHAR(10) PRIMARY KEY, -- Format: YYMMDD (e.g., '241229')
  sequence_number INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on last_updated for cleanup of old sequences (optional)
CREATE INDEX IF NOT EXISTS idx_order_sequences_last_updated ON order_sequences(last_updated);

-- Add comment
COMMENT ON TABLE order_sequences IS 'Tracks sequence numbers for order number generation per date. Used to generate unique order numbers in format TC-YYMMDD-####';
COMMENT ON COLUMN order_sequences.date_key IS 'Date in YYMMDD format (e.g., 241229 for Dec 29, 2024)';
COMMENT ON COLUMN order_sequences.sequence_number IS 'Current sequence number for this date. Increments atomically for each new order.';

-- Enable Row Level Security
ALTER TABLE order_sequences ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Service role only
CREATE POLICY "Service role can manage order sequences" ON order_sequences
  FOR ALL USING (auth.role() = 'service_role');

-- Create a function to atomically get and increment the sequence
-- This function uses PostgreSQL's atomic operations to ensure thread-safe sequence generation
CREATE OR REPLACE FUNCTION get_next_order_sequence(p_date_key VARCHAR(10))
RETURNS INTEGER AS $$
DECLARE
  v_sequence INTEGER;
BEGIN
  -- Insert or update atomically using ON CONFLICT
  -- If date_key doesn't exist, insert with sequence 1
  -- If it exists, increment the sequence number
  INSERT INTO order_sequences (date_key, sequence_number, last_updated)
  VALUES (p_date_key, 1, NOW())
  ON CONFLICT (date_key) 
  DO UPDATE SET 
    sequence_number = order_sequences.sequence_number + 1,
    last_updated = NOW()
  RETURNING sequence_number INTO v_sequence;
  
  RETURN v_sequence;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION get_next_order_sequence(VARCHAR) TO service_role;

COMMENT ON FUNCTION get_next_order_sequence IS 'Atomically gets and increments the sequence number for a given date. Returns the new sequence number. Thread-safe for concurrent order creation.';

