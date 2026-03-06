-- Seed: Insert Dummy Products Data
-- Description: Seeds the products table with initial dummy data from hardcoded frontend data
-- Date: 2024
-- Note: This matches the hardcoded products in frontend/src/services/api.ts
-- Note: Category IDs are resolved by slug lookup (categories must exist first)
-- Note: Discount percentage is calculated from originalPrice and price
-- Note: USP tag is extracted from tags array (looks for "100% organic cotton" or similar)

-- Clear existing data (optional - comment out if you want to keep existing data)
-- TRUNCATE TABLE products CASCADE;

-- Insert dummy products
-- Category IDs are resolved via subquery using category slugs
-- Discount percentage is calculated: ((originalPrice - price) / originalPrice) * 100
-- USP tag is extracted from tags array if it contains "organic" or similar keywords
INSERT INTO products (
  category_id,
  title,
  description,
  selling_price,
  discount_percentage,
  usp_tag,
  main_image_url,
  mockup_images,
  mockup_video_url,
  rating,
  review_count,
  variants
) VALUES
  -- Product 1: Classic Crewneck Tee
  (
    (SELECT id FROM categories WHERE slug = 't-shirts' LIMIT 1),
    'Classic Crewneck Tee',
    'A timeless classic, this crewneck t-shirt is made from ultra-soft pima cotton for a comfortable fit and feel.',
    50.00, -- selling_price (originalPrice)
    30.00, -- discount_percentage: ((50 - 35) / 50) * 100 = 30%
    '100% organic cotton', -- USP tag from tags array
    'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=987&auto=format&fit=crop',
    '[]'::jsonb, -- mockup_images (empty for now)
    NULL, -- mockup_video_url
    4.5, -- rating
    182, -- review_count
    '{"sizes": ["S", "M", "L", "XL"], "colors": ["Black", "White", "HeatherGray"]}'::jsonb
  ),
  
  -- Product 2: Custom Hoodie Pro
  (
    (SELECT id FROM categories WHERE slug = 'hoodies' LIMIT 1),
    'Custom Hoodie Pro',
    'Premium quality hoodie with custom design options. Made from 100% organic cotton for ultimate comfort.',
    120.00, -- selling_price (originalPrice)
    25.00, -- discount_percentage: ((120 - 89.99) / 120) * 100 ≈ 25%
    '100% organic cotton', -- USP tag
    'https://images.unsplash.com/photo-1509942774463-acf339cf87d5?q=80&w=1170&auto=format&fit=crop',
    '[]'::jsonb,
    NULL,
    3.5,
    234,
    '{"sizes": ["S", "M", "L", "XL"], "colors": ["#374151", "#1e3a8a", "#15803d"]}'::jsonb
  ),
  
  -- Product 3: Signature Logo Mug
  (
    (SELECT id FROM categories WHERE slug = 'mugs' LIMIT 1),
    'Signature Logo Mug',
    'Start your day with our signature logo mug. This ceramic mug features a minimalist design and a comfortable handle.',
    15.00, -- selling_price (no discount)
    NULL, -- discount_percentage (no discount)
    NULL, -- usp_tag (no organic tag)
    'https://images.unsplash.com/photo-1608979328229-db0085a23924?q=80&w=987&auto=format&fit=crop',
    '[]'::jsonb,
    NULL,
    5.0,
    98,
    '{"sizes": ["11oz"], "colors": ["White"]}'::jsonb
  ),
  
  -- Product 4: Abstract Lines Wall Art
  (
    (SELECT id FROM categories WHERE slug = 'wall-art' LIMIT 1),
    'Abstract Lines Wall Art',
    'Elevate your space with this modern abstract wall art. Printed on high-quality matte paper for a sophisticated look.',
    65.00, -- selling_price (originalPrice)
    23.08, -- discount_percentage: ((65 - 50) / 65) * 100 ≈ 23.08%
    NULL, -- usp_tag
    'https://images.unsplash.com/photo-1549492423-400259a5cd31?q=80&w=1035&auto=format&fit=crop',
    '[]'::jsonb,
    NULL,
    4.0,
    45,
    '{"sizes": ["12x16", "18x24", "24x36"], "colors": ["N/A"]}'::jsonb
  ),
  
  -- Product 5: Vintage Wash Tee
  (
    (SELECT id FROM categories WHERE slug = 't-shirts' LIMIT 1),
    'Vintage Wash Tee',
    'Get that perfectly worn-in feel from day one. Our vintage wash tee is specially treated for a soft, faded look.',
    40.00, -- selling_price (no discount)
    NULL, -- discount_percentage
    NULL, -- usp_tag (no organic tag in this one)
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=880&auto=format&fit=crop',
    '[]'::jsonb,
    NULL,
    4.5,
    112,
    '{"sizes": ["S", "M", "L"], "colors": ["#4b5563", "#60a5fa"]}'::jsonb
  ),
  
  -- Product 6: Zip-Up Tech Hoodie
  (
    (SELECT id FROM categories WHERE slug = 'hoodies' LIMIT 1),
    'Zip-Up Tech Hoodie',
    'The perfect hoodie for those on the go. Made from a moisture-wicking tech fabric, it''s great for workouts or casual wear.',
    110.00, -- selling_price (originalPrice)
    13.64, -- discount_percentage: ((110 - 95) / 110) * 100 ≈ 13.64%
    NULL, -- usp_tag
    'https://images.unsplash.com/photo-1556157382-97eda2d62296?q=80&w=1000&auto=format&fit=crop',
    '[]'::jsonb,
    NULL,
    5.0,
    78,
    '{"sizes": ["M", "L", "XL"], "colors": ["Black", "Gray"]}'::jsonb
  ),
  
  -- Product 7: Minimalist Graphic Tee
  (
    (SELECT id FROM categories WHERE slug = 't-shirts' LIMIT 1),
    'Minimalist Graphic Tee',
    'Make a statement with simplicity. This tee features a clean, minimalist graphic on our signature soft cotton.',
    38.00, -- selling_price (no discount)
    NULL, -- discount_percentage
    '100% organic cotton', -- USP tag
    'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=1000&auto=format&fit=crop',
    '[]'::jsonb,
    NULL,
    4.0,
    91,
    '{"sizes": ["S", "M", "L", "XL"], "colors": ["White", "#f5f5dc"]}'::jsonb
  ),
  
  -- Product 8: Cozy Knit Beanie
  (
    (SELECT id FROM categories WHERE slug = 'accessories' LIMIT 1),
    'Cozy Knit Beanie',
    'A soft, comfortable beanie for chilly days. Made from a fine-knit acrylic blend for warmth without the itch.',
    25.00, -- selling_price (no discount)
    NULL, -- discount_percentage
    NULL, -- usp_tag
    'https://images.unsplash.com/photo-1575428652377-a3d80e281e6e?q=80&w=987&auto=format&fit=crop',
    '[]'::jsonb,
    NULL,
    4.5,
    150,
    '{"sizes": ["One Size"], "colors": ["Black", "#eab308", "#166534"]}'::jsonb
  ),
  
  -- Product 9: Premium Cotton Sweatshirt
  (
    (SELECT id FROM categories WHERE slug = 'hoodies' LIMIT 1),
    'Premium Cotton Sweatshirt',
    'Ultra-soft premium cotton sweatshirt perfect for lounging or casual outings. Comfort meets style.',
    85.00, -- selling_price (originalPrice)
    23.53, -- discount_percentage: ((85 - 65) / 85) * 100 ≈ 23.53%
    NULL, -- usp_tag (no organic tag)
    'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=987&auto=format&fit=crop',
    '[]'::jsonb,
    NULL,
    4.8,
    203,
    '{"sizes": ["S", "M", "L", "XL"], "colors": ["#1f2937", "#3b82f6", "#059669"]}'::jsonb
  ),
  
  -- Product 10: Designer Print T-Shirt
  (
    (SELECT id FROM categories WHERE slug = 't-shirts' LIMIT 1),
    'Designer Print T-Shirt',
    'Limited edition designer print tee featuring exclusive artwork. Stand out from the crowd.',
    42.00, -- selling_price (no discount)
    NULL, -- discount_percentage
    NULL, -- usp_tag
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=880&auto=format&fit=crop',
    '[]'::jsonb,
    NULL,
    4.7,
    89,
    '{"sizes": ["S", "M", "L", "XL"], "colors": ["Black", "White", "#ef4444"]}'::jsonb
  );

-- Verify the data
SELECT 
  p.id,
  p.title,
  c.name as category_name,
  c.slug as category_slug,
  p.selling_price,
  p.discount_percentage,
  p.usp_tag,
  p.created_at
FROM products p
JOIN categories c ON p.category_id = c.id
ORDER BY p.created_at;

