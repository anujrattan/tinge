-- Migration: Create blog_posts and faq_items tables
-- Description: Adds basic CMS-style tables for SEO blog content and FAQs.
-- Date: 2026-01-28

-- 1) Blog posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  content_markdown TEXT NOT NULL,
  cover_image TEXT,
  seo_title TEXT,
  seo_description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at
  ON blog_posts (is_published, published_at DESC);

COMMENT ON TABLE blog_posts IS 'Marketing/SEO blog posts for Luxe Threads.';
COMMENT ON COLUMN blog_posts.slug IS 'URL slug for the blog post (unique).';
COMMENT ON COLUMN blog_posts.content_markdown IS 'Markdown content of the blog post.';

-- 2) FAQ items table
CREATE TABLE IF NOT EXISTS faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer_markdown TEXT NOT NULL,
  category TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faq_items_category_order
  ON faq_items (category, sort_order);

COMMENT ON TABLE faq_items IS 'Frequently Asked Questions used for support and SEO.';
COMMENT ON COLUMN faq_items.category IS 'Logical grouping for FAQ (e.g., Shipping, Orders, Payments).';

