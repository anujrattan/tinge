-- Migration: Create user_addresses table
-- Description: Stores multiple addresses per user for shipping/billing
-- This allows users to have multiple saved addresses
-- Date: 2024

-- Create user_addresses table
CREATE TABLE IF NOT EXISTS user_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT, -- e.g., "Home", "Work", "Office"
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address1 TEXT NOT NULL,
  address2 TEXT,
  city VARCHAR(255) NOT NULL,
  province VARCHAR(255),
  zip VARCHAR(50) NOT NULL,
  country_code VARCHAR(10) NOT NULL DEFAULT 'IN',
  type VARCHAR(20) DEFAULT 'shipping' CHECK (type IN ('shipping', 'billing', 'both')),
  is_primary BOOLEAN DEFAULT false, -- Primary/default address
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_is_primary ON user_addresses(is_primary);
CREATE INDEX IF NOT EXISTS idx_user_addresses_type ON user_addresses(type);

-- Create partial unique index to ensure only one primary address per user
-- This allows multiple addresses per user but only one can be primary
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_addresses_one_primary 
  ON user_addresses(user_id) 
  WHERE is_primary = true;

-- Enable Row Level Security
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own addresses" ON user_addresses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = user_addresses.user_id 
      AND (users.auth_user_id = auth.uid() OR auth.role() = 'service_role')
    ) OR auth.role() = 'service_role'
  );

CREATE POLICY "Users can manage own addresses" ON user_addresses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = user_addresses.user_id 
      AND (users.auth_user_id = auth.uid() OR auth.role() = 'service_role')
    ) OR auth.role() = 'service_role'
  );

-- Function to ensure only one primary address per user
-- This is handled at application level, but we can add a constraint function
CREATE OR REPLACE FUNCTION ensure_single_primary_address()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this address as primary, unset others
  IF NEW.is_primary = true THEN
    UPDATE user_addresses
    SET is_primary = false
    WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single primary address
DROP TRIGGER IF EXISTS check_single_primary_address ON user_addresses;
CREATE TRIGGER check_single_primary_address
  BEFORE INSERT OR UPDATE ON user_addresses
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION ensure_single_primary_address();

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_addresses_updated_at ON user_addresses;
CREATE TRIGGER update_user_addresses_updated_at
  BEFORE UPDATE ON user_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_user_addresses_updated_at();

-- Comments
COMMENT ON TABLE user_addresses IS 'Stores multiple addresses per user for shipping/billing. Users can have multiple saved addresses with one marked as primary.';
COMMENT ON COLUMN user_addresses.is_primary IS 'Indicates if this is the primary/default address for the user';
COMMENT ON COLUMN user_addresses.label IS 'Optional label for the address (e.g., "Home", "Work")';

