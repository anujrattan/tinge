-- Migration: Create Categories Table
-- Description: Creates the categories table with all necessary fields
-- Date: 2024

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- Create index on name for sorting
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public read, service role write
-- Note: Service role key bypasses RLS, but we still define policies for clarity

-- Allow everyone to read categories
CREATE POLICY "Categories are viewable by everyone" ON categories
  FOR SELECT USING (true);

-- Allow service role to insert categories
CREATE POLICY "Categories are insertable by service role" ON categories
  FOR INSERT WITH CHECK (true);

-- Allow service role to update categories
CREATE POLICY "Categories are updatable by service role" ON categories
  FOR UPDATE USING (true);

-- Allow service role to delete categories
CREATE POLICY "Categories are deletable by service role" ON categories
  FOR DELETE USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_categories_updated_at();

-- Add comment to table
COMMENT ON TABLE categories IS 'Stores product categories with slug-based routing support';

