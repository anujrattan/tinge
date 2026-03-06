-- Migration: Create product_ratings table
-- Description: Stores star ratings (1-5) submitted by users for products they purchased
-- Date: 2026-01-12

-- Create product_ratings table
CREATE TABLE IF NOT EXISTS product_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Rating value (1-5 stars)
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One rating per user per product per order
  -- User can rate same product multiple times from different orders
  CONSTRAINT unique_user_product_order UNIQUE(user_id, product_id, order_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ratings_product_id ON product_ratings(product_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON product_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_order_id ON product_ratings(order_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rating ON product_ratings(rating);
CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON product_ratings(created_at);

-- Add rating_count column to products table (rating column already exists)
ALTER TABLE products ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

-- Enable Row Level Security
ALTER TABLE product_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view all ratings (public)
CREATE POLICY "Anyone can view ratings" ON product_ratings
  FOR SELECT USING (true);

-- Users can insert their own ratings
CREATE POLICY "Users can insert own ratings" ON product_ratings
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT users.auth_user_id FROM users WHERE users.id = user_id)
    OR auth.role() = 'service_role'
  );

-- Users can update their own ratings
CREATE POLICY "Users can update own ratings" ON product_ratings
  FOR UPDATE USING (
    auth.uid() = (SELECT users.auth_user_id FROM users WHERE users.id = user_id)
    OR auth.role() = 'service_role'
  );

-- Users can delete their own ratings
CREATE POLICY "Users can delete own ratings" ON product_ratings
  FOR DELETE USING (
    auth.uid() = (SELECT users.auth_user_id FROM users WHERE users.id = user_id)
    OR auth.role() = 'service_role'
  );

-- Service role can manage all ratings
CREATE POLICY "Service role can manage all ratings" ON product_ratings
  FOR ALL USING (auth.role() = 'service_role');

-- Trigger function to update product rating
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
DECLARE
  target_product_id UUID;
BEGIN
  -- Determine which product to update
  IF (TG_OP = 'DELETE') THEN
    target_product_id := OLD.product_id;
  ELSE
    target_product_id := NEW.product_id;
  END IF;
  
  -- Update product's average rating and rating count
  UPDATE products
  SET 
    rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM product_ratings
      WHERE product_id = target_product_id
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM product_ratings
      WHERE product_id = target_product_id
    )
  WHERE id = target_product_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update product rating on insert/update/delete
DROP TRIGGER IF EXISTS trigger_update_product_rating ON product_ratings;
CREATE TRIGGER trigger_update_product_rating
AFTER INSERT OR UPDATE OR DELETE ON product_ratings
FOR EACH ROW
EXECUTE FUNCTION update_product_rating();

-- Trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_product_ratings_updated_at ON product_ratings;
CREATE TRIGGER update_product_ratings_updated_at
  BEFORE UPDATE ON product_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_product_ratings_updated_at();

-- Comments for documentation
COMMENT ON TABLE product_ratings IS 'Stores star ratings (1-5) for products from delivered orders';
COMMENT ON COLUMN product_ratings.rating IS 'Star rating value (1-5)';
COMMENT ON COLUMN product_ratings.order_id IS 'Reference to the order from which this rating was submitted';
COMMENT ON CONSTRAINT unique_user_product_order ON product_ratings IS 'One rating per user per product per order (can update existing)';
