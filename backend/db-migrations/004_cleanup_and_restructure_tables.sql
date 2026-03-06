-- Migration: Create users table
-- Description: Creates users table to store user profile and address information
-- Date: 2024

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Optional: Link to auth.users if authenticated user
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address1 TEXT NOT NULL,
  address2 TEXT,
  city VARCHAR(255) NOT NULL,
  province VARCHAR(255),
  zip VARCHAR(50) NOT NULL,
  country_code VARCHAR(10) NOT NULL DEFAULT 'IN',
  type VARCHAR(20) DEFAULT 'shipping' CHECK (type IN ('shipping', 'billing')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(type);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (
    auth_user_id = auth.uid() OR auth.role() = 'service_role'
  );

CREATE POLICY "Service role can manage all users" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- Comments
COMMENT ON TABLE users IS 'Stores user profile and address information. Created from signup, onboarding, or checkout. Orders reference users via user_id.';
COMMENT ON COLUMN users.auth_user_id IS 'Optional link to auth.users if this is an authenticated user account';
COMMENT ON COLUMN users.type IS 'Default address type: shipping or billing';

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();
