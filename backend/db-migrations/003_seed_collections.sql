-- Demo collections for homepage "Shop by Collection" (safe to re-run).

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

UPDATE tinge_products p
SET collection_id = c.id
FROM tinge_collections c
WHERE c.slug = 'horizon-studies'
  AND p.title IN ('Horizon Line — Framed ACP', 'Tinge Wordmark — Neon')
  AND p.collection_id IS NULL;

UPDATE tinge_products p
SET collection_id = c.id
FROM tinge_collections c
WHERE c.slug = 'soft-geometry'
  AND p.title IN ('Soft Drift — Canvas', 'Studio Grid — Sunboard')
  AND p.collection_id IS NULL;
