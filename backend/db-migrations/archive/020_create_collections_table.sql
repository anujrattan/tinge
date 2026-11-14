-- Migration: Create collections table and add collection_id to products
-- Description: Introduces collections for merchandising (single collection per product).
-- Date: 2026-02-19

-- 1) Collections table
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collections_is_active_sort
  ON collections (is_active, sort_order, created_at DESC);

COMMENT ON TABLE collections IS 'Merchandising collections (e.g., Streetwear Edit, Essentials).';
COMMENT ON COLUMN collections.slug IS 'URL slug for the collection (unique).';

-- 2) Add collection_id to products (single collection per product, optional)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES collections(id);

CREATE INDEX IF NOT EXISTS idx_products_collection_id
  ON products (collection_id);

