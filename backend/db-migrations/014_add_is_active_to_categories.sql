-- Migration: Add is_active column to categories table
-- Description: Adds is_active column to enable/disable categories without deleting them
-- Date: 2024

-- Add is_active column to categories table
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Create index on is_active for faster filtering
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

-- Update existing categories to be active by default (already handled by DEFAULT, but explicit for clarity)
UPDATE categories SET is_active = true WHERE is_active IS NULL;

-- Add comment
COMMENT ON COLUMN categories.is_active IS 'When false, category and its products are hidden from storefront';

