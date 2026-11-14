-- Demo seed for local E2E (run after 000_art_bootstrap.sql)
-- IDs come from uuid_generate_v4() — no hardcoded UUIDs.
-- Safe to re-run: categories upsert by slug; products skip if title already exists.
-- Replace image URLs with your Storage/CDN assets when available.

INSERT INTO tinge_categories (name, slug, image_url, is_active)
VALUES
  ('Featured Art', 'featured-art', '', true),
  ('Abstract', 'abstract', '', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tinge_collections (name, slug, description, image_url, is_active, sort_order)
VALUES
  (
    'Horizon Studies',
    'horizon-studies',
    'Quiet landscape lines for ACP and neon.',
    'https://placehold.co/800x560/1c1917/f5f5f4?text=Horizon+Studies',
    true,
    1
  ),
  (
    'Soft Geometry',
    'soft-geometry',
    'Abstract shapes tuned for canvas and sunboard.',
    'https://placehold.co/800x560/44403c/fafaf9?text=Soft+Geometry',
    true,
    2
  )
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tinge_products (
  category_id, collection_id, title, description, material, selling_price,
  main_image_url, mockup_images, variants, is_active, is_featured
)
SELECT c.id, col.id,
  'Horizon Line — Framed ACP',
  'UV print on aluminium composite, framed. Designed for hard-panel gloss.',
  'framed_acp',
  8999,
  'https://placehold.co/800x1000/1c1917/f5f5f4?text=Framed+ACP',
  '["https://placehold.co/800x1000/1c1917/f5f5f4?text=ACP+Mockup"]'::jsonb,
  '{
    "sizes": ["6 × 4 ft", "4 × 4 ft", "4 × 2 ft", "3 × 2 ft"],
    "size_prices": {
      "6 × 4 ft": 18999,
      "4 × 4 ft": 12999,
      "4 × 2 ft": 8999,
      "3 × 2 ft": 6999
    }
  }'::jsonb,
  true,
  true
FROM tinge_categories c
CROSS JOIN tinge_collections col
WHERE c.slug = 'featured-art'
  AND col.slug = 'horizon-studies'
  AND NOT EXISTS (
    SELECT 1 FROM tinge_products p WHERE p.title = 'Horizon Line — Framed ACP'
  );

INSERT INTO tinge_products (
  category_id, title, description, material, selling_price,
  main_image_url, mockup_images, variants, is_active, is_featured
)
SELECT c.id,
  'Soft Drift — Canvas',
  'Textile surface print. Artwork tuned for canvas, not ACP gloss.',
  'canvas',
  5499,
  'https://placehold.co/800x1000/44403c/fafaf9?text=Canvas',
  '["https://placehold.co/800x1000/44403c/fafaf9?text=Canvas+Mockup"]'::jsonb,
  '{
    "sizes": ["4 × 4 ft", "4 × 2 ft", "3 × 2 ft"],
    "size_prices": {
      "4 × 4 ft": 7999,
      "4 × 2 ft": 5499,
      "3 × 2 ft": 3999
    }
  }'::jsonb,
  true,
  true
FROM tinge_categories c
WHERE c.slug = 'abstract'
  AND NOT EXISTS (
    SELECT 1 FROM tinge_products p WHERE p.title = 'Soft Drift — Canvas'
  );

INSERT INTO tinge_products (
  category_id, title, description, material, selling_price,
  main_image_url, mockup_images, variants, is_active, is_featured
)
SELECT c.id,
  'Studio Grid — Sunboard',
  'Rigid foam panel for lighter walls and first pieces.',
  'sunboard',
  2499,
  'https://placehold.co/800x1000/78716c/fafaf9?text=Sunboard',
  '[]'::jsonb,
  '{
    "sizes": ["4 × 2 ft", "3 × 2 ft"],
    "size_prices": {
      "4 × 2 ft": 2499,
      "3 × 2 ft": 1799
    }
  }'::jsonb,
  true,
  false
FROM tinge_categories c
WHERE c.slug = 'abstract'
  AND NOT EXISTS (
    SELECT 1 FROM tinge_products p WHERE p.title = 'Studio Grid — Sunboard'
  );

INSERT INTO tinge_products (
  category_id, title, description, material, selling_price,
  main_image_url, mockup_images, variants, is_active, is_featured
)
SELECT c.id,
  'Tinge Wordmark — Neon',
  'Neon lettering confirmed to size before production.',
  'neon',
  12999,
  'https://placehold.co/800x1000/0c0a09/ff7a59?text=Neon',
  '[]'::jsonb,
  '{
    "sizes": ["Custom — confirm before produce"],
    "size_prices": {
      "Custom — confirm before produce": 12999
    }
  }'::jsonb,
  true,
  true
FROM tinge_categories c
WHERE c.slug = 'featured-art'
  AND NOT EXISTS (
    SELECT 1 FROM tinge_products p WHERE p.title = 'Tinge Wordmark — Neon'
  );
