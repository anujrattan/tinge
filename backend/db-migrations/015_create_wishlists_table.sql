-- Migration: Create wishlists table
-- Description: Stores user wishlist items for both logged-in and guest users
-- Date: 2026-01-12

-- Create wishlists table
CREATE TABLE IF NOT EXISTS wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate entries: one product per user wishlist
  CONSTRAINT unique_user_product UNIQUE(user_id, product_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product_id ON wishlists(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_created_at ON wishlists(created_at);

-- Enable Row Level Security
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own wishlist items
CREATE POLICY "Users can view own wishlist" ON wishlists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = wishlists.user_id 
      AND (users.auth_user_id = auth.uid() OR auth.role() = 'service_role')
    ) OR auth.role() = 'service_role'
  );

-- Users can add items to their own wishlist
CREATE POLICY "Users can add to own wishlist" ON wishlists
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = wishlists.user_id 
      AND (users.auth_user_id = auth.uid() OR auth.role() = 'service_role')
    ) OR auth.role() = 'service_role'
  );

-- Users can remove items from their own wishlist
CREATE POLICY "Users can remove from own wishlist" ON wishlists
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = wishlists.user_id 
      AND (users.auth_user_id = auth.uid() OR auth.role() = 'service_role')
    ) OR auth.role() = 'service_role'
  );

-- Service role can manage all wishlist items
CREATE POLICY "Service role can manage all wishlists" ON wishlists
  FOR ALL USING (auth.role() = 'service_role');

-- Comments for documentation
COMMENT ON TABLE wishlists IS 'Stores user wishlist items. Each user can have multiple wishlist items but only one entry per product.';
COMMENT ON COLUMN wishlists.user_id IS 'Foreign key to users table';
COMMENT ON COLUMN wishlists.product_id IS 'Foreign key to products table';
COMMENT ON CONSTRAINT unique_user_product ON wishlists IS 'Ensures each product can only be added once per user wishlist';
