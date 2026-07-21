-- Featured Art: admin-curated homepage / gallery flag
-- Ordering on the storefront uses products.created_at (newest listings first),
-- not the time they were marked featured.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_products_is_featured_created_at
  ON products (is_featured, created_at DESC)
  WHERE is_featured = true AND is_active = true;

COMMENT ON COLUMN products.is_featured IS
  'When true, product can appear in Featured Art (homepage carousel + /featured-art). Sorted by created_at DESC.';
