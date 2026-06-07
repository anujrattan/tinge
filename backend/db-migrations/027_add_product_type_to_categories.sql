-- Add product_type to categories for apparel vs metal poster behavior

ALTER TABLE categories
ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'apparel';

ALTER TABLE categories
DROP CONSTRAINT IF EXISTS categories_product_type_check;

ALTER TABLE categories
ADD CONSTRAINT categories_product_type_check
CHECK (product_type IN ('apparel', 'poster'));

UPDATE categories SET product_type = 'apparel' WHERE product_type IS NULL;

COMMENT ON COLUMN categories.product_type IS 'Drives admin form and storefront: apparel (tees) or poster (metal posters).';

-- Optional seed — safe to run if slug already exists
-- Seed Metal Posters category when slug is free (set image in admin after migrate)
INSERT INTO categories (name, slug, image_url, is_active, product_type)
SELECT 'Metal Posters', 'metal-posters', 'https://placehold.co/600x800/1a1410/F7F3EA?text=Metal+Posters', true, 'poster'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'metal-posters');

UPDATE categories SET product_type = 'poster' WHERE slug = 'metal-posters';
