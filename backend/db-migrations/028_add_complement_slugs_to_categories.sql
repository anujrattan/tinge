-- Cross-sell: which category slugs to recommend when this category is in the cart

ALTER TABLE categories
ADD COLUMN IF NOT EXISTS complement_slugs text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN categories.complement_slugs IS 'Slugs of categories to show as cart upsells when products from this category are in the cart.';
