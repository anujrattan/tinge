-- Tinge art-only schema for a SHARED Supabase database.
-- All tables / RPCs / triggers are prefixed with tinge_ to avoid colliding with other apps.
-- Apply via SQL Editor. Safe alongside other projects' tables.
-- Requires: uuid-ossp (Supabase provides uuid_generate_v4)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tinge_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tinge_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  complement_slugs TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tinge_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tinge_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES tinge_categories(id) ON DELETE SET NULL,
  collection_id UUID REFERENCES tinge_collections(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  -- framed_acp | canvas | sunboard | neon
  material TEXT NOT NULL CHECK (material IN ('framed_acp', 'canvas', 'sunboard', 'neon')),
  selling_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount_percentage NUMERIC(5, 2) DEFAULT 0,
  on_sale BOOLEAN NOT NULL DEFAULT false,
  sale_discount_percentage NUMERIC(5, 2) DEFAULT 0,
  usp_tag TEXT,
  main_image_url TEXT NOT NULL DEFAULT '',
  mockup_images JSONB NOT NULL DEFAULT '[]'::jsonb,
  mockup_video_url TEXT,
  -- { "sizes": ["4 × 2 ft", ...], "size_prices": { "4 × 2 ft": 4999 } }
  variants JSONB NOT NULL DEFAULT '{"sizes":[],"size_prices":{}}'::jsonb,
  design_family TEXT,
  rating NUMERIC(3, 2) DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tinge_products_category_id ON tinge_products(category_id);
CREATE INDEX IF NOT EXISTS idx_tinge_products_collection_id ON tinge_products(collection_id);
CREATE INDEX IF NOT EXISTS idx_tinge_products_material ON tinge_products(material);
CREATE INDEX IF NOT EXISTS idx_tinge_products_is_active ON tinge_products(is_active);
CREATE INDEX IF NOT EXISTS idx_tinge_products_is_featured ON tinge_products(is_featured);
CREATE INDEX IF NOT EXISTS idx_tinge_products_created_at ON tinge_products(created_at DESC);

DROP TRIGGER IF EXISTS trg_tinge_products_updated_at ON tinge_products;
CREATE TRIGGER trg_tinge_products_updated_at
  BEFORE UPDATE ON tinge_products FOR EACH ROW EXECUTE FUNCTION public.tinge_set_updated_at();

DROP TRIGGER IF EXISTS trg_tinge_categories_updated_at ON tinge_categories;
CREATE TRIGGER trg_tinge_categories_updated_at
  BEFORE UPDATE ON tinge_categories FOR EACH ROW EXECUTE FUNCTION public.tinge_set_updated_at();

DROP TRIGGER IF EXISTS trg_tinge_collections_updated_at ON tinge_collections;
CREATE TRIGGER trg_tinge_collections_updated_at
  BEFORE UPDATE ON tinge_collections FOR EACH ROW EXECUTE FUNCTION public.tinge_set_updated_at();

-- ---------------------------------------------------------------------------
-- Users / auth profile
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tinge_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL DEFAULT '',
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address1 TEXT NOT NULL DEFAULT '',
  address2 TEXT,
  city VARCHAR(255) NOT NULL DEFAULT '',
  province VARCHAR(255),
  zip VARCHAR(50) NOT NULL DEFAULT '',
  country_code VARCHAR(10) NOT NULL DEFAULT 'IN',
  type VARCHAR(20) DEFAULT 'shipping' CHECK (type IN ('shipping', 'billing')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tinge_users_email ON tinge_users(email);
CREATE INDEX IF NOT EXISTS idx_tinge_users_auth_user_id ON tinge_users(auth_user_id);

DROP TRIGGER IF EXISTS trg_tinge_users_updated_at ON tinge_users;
CREATE TRIGGER trg_tinge_users_updated_at
  BEFORE UPDATE ON tinge_users FOR EACH ROW EXECUTE FUNCTION public.tinge_set_updated_at();

CREATE TABLE IF NOT EXISTS tinge_user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tinge_user_profiles_role ON tinge_user_profiles(role);

-- Only create a Tinge profile when Auth marks the user for this app.
-- Shared auth.users: real-estate signups must NOT get a tinge_user_profiles row.
-- Tag via app_metadata.apps = ["tinge"] (service role / Tinge backend only — never trust user_metadata for this).
CREATE OR REPLACE FUNCTION public.tinge_handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  apps jsonb := COALESCE(NEW.raw_app_meta_data->'apps', '[]'::jsonb);
  is_tinge boolean := (apps ? 'tinge') OR (NEW.raw_app_meta_data->>'app' = 'tinge');
BEGIN
  IF NOT is_tinge THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.tinge_user_profiles (id, email, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.phone, NEW.id::text),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email, 'user'), '@', 1)),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tinge_on_auth_user_created ON auth.users;
CREATE TRIGGER tinge_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.tinge_handle_new_user();

DROP TRIGGER IF EXISTS trg_tinge_user_profiles_updated_at ON tinge_user_profiles;
CREATE TRIGGER trg_tinge_user_profiles_updated_at
  BEFORE UPDATE ON tinge_user_profiles FOR EACH ROW EXECUTE FUNCTION public.tinge_set_updated_at();

CREATE TABLE IF NOT EXISTS tinge_user_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES tinge_users(id) ON DELETE CASCADE,
  label TEXT,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL DEFAULT '',
  phone VARCHAR(50),
  address1 TEXT NOT NULL,
  address2 TEXT,
  city VARCHAR(255) NOT NULL,
  province VARCHAR(255),
  zip VARCHAR(50) NOT NULL,
  country_code VARCHAR(10) NOT NULL DEFAULT 'IN',
  type VARCHAR(20) DEFAULT 'shipping' CHECK (type IN ('shipping', 'billing')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tinge_user_addresses_user_id ON tinge_user_addresses(user_id);

DROP TRIGGER IF EXISTS trg_tinge_user_addresses_updated_at ON tinge_user_addresses;
CREATE TRIGGER trg_tinge_user_addresses_updated_at
  BEFORE UPDATE ON tinge_user_addresses FOR EACH ROW EXECUTE FUNCTION public.tinge_set_updated_at();

-- ---------------------------------------------------------------------------
-- Orders / tinge_payments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tinge_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES tinge_users(id) ON DELETE SET NULL,
  user_email VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled', 'failed')),
  subtotal NUMERIC(10, 2) NOT NULL,
  tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  shipping_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
  cod_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10, 2) NOT NULL,
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
  payment_id UUID,
  gateway VARCHAR(50) NOT NULL DEFAULT 'COD' CHECK (gateway IN ('COD', 'Prepaid')),
  shipping_partner TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tinge_orders_user_id ON tinge_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_tinge_orders_user_email ON tinge_orders(user_email);
CREATE INDEX IF NOT EXISTS idx_tinge_orders_status ON tinge_orders(status);
CREATE INDEX IF NOT EXISTS idx_tinge_orders_created_at ON tinge_orders(created_at DESC);

DROP TRIGGER IF EXISTS trg_tinge_orders_updated_at ON tinge_orders;
CREATE TRIGGER trg_tinge_orders_updated_at
  BEFORE UPDATE ON tinge_orders FOR EACH ROW EXECUTE FUNCTION public.tinge_set_updated_at();

CREATE TABLE IF NOT EXISTS tinge_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES tinge_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES tinge_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  size TEXT,
  material TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tinge_order_items_order_id ON tinge_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_tinge_order_items_product_id ON tinge_order_items(product_id);

CREATE TABLE IF NOT EXISTS tinge_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES tinge_orders(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL DEFAULT 'shipping' CHECK (type IN ('shipping', 'billing')),
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL DEFAULT '',
  email VARCHAR(255),
  phone VARCHAR(50),
  address1 TEXT NOT NULL,
  address2 TEXT,
  city VARCHAR(255) NOT NULL,
  province VARCHAR(255),
  zip VARCHAR(50) NOT NULL,
  country_code VARCHAR(10) NOT NULL DEFAULT 'IN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tinge_addresses_order_id ON tinge_addresses(order_id);

CREATE TABLE IF NOT EXISTS tinge_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES tinge_orders(id) ON DELETE CASCADE,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status VARCHAR(50) NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded')),
  payment_method TEXT,
  gateway VARCHAR(50) NOT NULL DEFAULT 'Prepaid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tinge_payments_order_id ON tinge_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_tinge_payments_razorpay_order_id ON tinge_payments(razorpay_order_id);

DROP TRIGGER IF EXISTS trg_tinge_payments_updated_at ON tinge_payments;
CREATE TRIGGER trg_tinge_payments_updated_at
  BEFORE UPDATE ON tinge_payments FOR EACH ROW EXECUTE FUNCTION public.tinge_set_updated_at();

CREATE TABLE IF NOT EXISTS tinge_order_sequences (
  date_key VARCHAR(10) PRIMARY KEY,
  sequence_number INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION tinge_get_next_order_sequence(p_date_key VARCHAR(10))
RETURNS INTEGER AS $$
DECLARE
  v_sequence INTEGER;
BEGIN
  INSERT INTO tinge_order_sequences (date_key, sequence_number, last_updated)
  VALUES (p_date_key, 1, NOW())
  ON CONFLICT (date_key)
  DO UPDATE SET
    sequence_number = tinge_order_sequences.sequence_number + 1,
    last_updated = NOW()
  RETURNING sequence_number INTO v_sequence;
  RETURN v_sequence;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION tinge_get_next_order_sequence(VARCHAR) TO service_role;

CREATE TABLE IF NOT EXISTS tinge_order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES tinge_orders(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by UUID,
  changed_by_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tinge_order_status_history_order_id ON tinge_order_status_history(order_id);

-- ---------------------------------------------------------------------------
-- Engagement
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tinge_wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES tinge_users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES tinge_products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS tinge_product_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES tinge_products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES tinge_users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES tinge_orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id, order_id)
);

CREATE OR REPLACE FUNCTION public.tinge_refresh_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tinge_products p SET
    rating = COALESCE((
      SELECT ROUND(AVG(r.rating)::numeric, 2) FROM tinge_product_ratings r WHERE r.product_id = COALESCE(NEW.product_id, OLD.product_id)
    ), 0),
    rating_count = COALESCE((
      SELECT COUNT(*) FROM tinge_product_ratings r WHERE r.product_id = COALESCE(NEW.product_id, OLD.product_id)
    ), 0),
    updated_at = NOW()
  WHERE p.id = COALESCE(NEW.product_id, OLD.product_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tinge_product_ratings_refresh ON tinge_product_ratings;
CREATE TRIGGER trg_tinge_product_ratings_refresh
  AFTER INSERT OR UPDATE OR DELETE ON tinge_product_ratings
  FOR EACH ROW EXECUTE FUNCTION public.tinge_refresh_product_rating();

CREATE TABLE IF NOT EXISTS tinge_newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  source TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- CMS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tinge_blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  content_markdown TEXT,
  cover_image TEXT,
  seo_title TEXT,
  seo_description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tinge_faq_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  answer_markdown TEXT NOT NULL,
  category TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Returns (in-house; no partner claim fields)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tinge_return_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_number VARCHAR(50) UNIQUE,
  order_id UUID NOT NULL REFERENCES tinge_orders(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES tinge_order_items(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('refund', 'exchange')),
  status VARCHAR(30) NOT NULL DEFAULT 'pending_review' CHECK (status IN (
    'pending_review', 'approved', 'rejected', 'awaiting_shipment',
    'in_transit', 'received', 'completed', 'cancelled'
  )),
  reason VARCHAR(50) NOT NULL CHECK (reason IN (
    'defective', 'wrong_item', 'wrong_size', 'changed_mind', 'other'
  )),
  reason_detail TEXT,
  exchange_size TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  refund_amount NUMERIC(10, 2),
  photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  admin_notes TEXT,
  rejection_reason TEXT,
  return_ship_to TEXT,
  return_ship_instructions TEXT,
  manual_refund_ref TEXT,
  approved_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by_email VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tinge_return_requests_order_id ON tinge_return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_tinge_return_requests_status ON tinge_return_requests(status);

DROP TRIGGER IF EXISTS trg_tinge_return_requests_updated_at ON tinge_return_requests;
CREATE TRIGGER trg_tinge_return_requests_updated_at
  BEFORE UPDATE ON tinge_return_requests FOR EACH ROW EXECUTE FUNCTION public.tinge_set_updated_at();

CREATE TABLE IF NOT EXISTS tinge_return_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_request_id UUID NOT NULL REFERENCES tinge_return_requests(id) ON DELETE CASCADE,
  old_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL,
  changed_by_email VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tinge_return_status_history_return_id ON tinge_return_status_history(return_request_id);

-- ---------------------------------------------------------------------------
-- RLS (service role for backend; authenticated read own rows where useful)
-- ---------------------------------------------------------------------------
ALTER TABLE tinge_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tinge_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE tinge_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tinge_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tinge_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tinge_user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tinge_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tinge_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tinge_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tinge_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tinge_order_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE tinge_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE tinge_wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE tinge_product_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tinge_newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tinge_blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tinge_faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tinge_return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tinge_return_status_history ENABLE ROW LEVEL SECURITY;

-- Public catalog reads
CREATE POLICY "Public read active tinge_categories" ON tinge_categories FOR SELECT USING (is_active = true OR auth.role() = 'service_role');
CREATE POLICY "Service manage tinge_categories" ON tinge_categories FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public read active tinge_collections" ON tinge_collections FOR SELECT USING (is_active = true OR auth.role() = 'service_role');
CREATE POLICY "Service manage tinge_collections" ON tinge_collections FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public read active tinge_products" ON tinge_products FOR SELECT USING (is_active = true OR auth.role() = 'service_role');
CREATE POLICY "Service manage tinge_products" ON tinge_products FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service manage tinge_users" ON tinge_users FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Users read own profile" ON tinge_user_profiles FOR SELECT USING (auth.uid() = id OR auth.role() = 'service_role');
CREATE POLICY "Service manage profiles" ON tinge_user_profiles FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service manage tinge_user_addresses" ON tinge_user_addresses FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service manage tinge_orders" ON tinge_orders FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service manage tinge_order_items" ON tinge_order_items FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service manage tinge_addresses" ON tinge_addresses FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service manage tinge_payments" ON tinge_payments FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service manage tinge_order_sequences" ON tinge_order_sequences FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service manage tinge_order_status_history" ON tinge_order_status_history FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service manage tinge_wishlists" ON tinge_wishlists FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service manage tinge_product_ratings" ON tinge_product_ratings FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service manage newsletter" ON tinge_newsletter_subscribers FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Public read published blog" ON tinge_blog_posts FOR SELECT USING (is_published = true OR auth.role() = 'service_role');
CREATE POLICY "Service manage blog" ON tinge_blog_posts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Public read published faqs" ON tinge_faq_items FOR SELECT USING (is_published = true OR auth.role() = 'service_role');
CREATE POLICY "Service manage faqs" ON tinge_faq_items FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service manage returns" ON tinge_return_requests FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service manage return history" ON tinge_return_status_history FOR ALL USING (auth.role() = 'service_role');
