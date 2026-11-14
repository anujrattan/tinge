-- Your Art end-to-end: custom art requests table + storage bucket + order item columns.
-- Safe to re-run on shared Supabase DB.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS tinge_custom_art_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES tinge_users(id) ON DELETE SET NULL,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_session_id TEXT,
  customer_email TEXT,
  material TEXT NOT NULL CHECK (material IN ('framed_acp', 'canvas', 'sunboard', 'neon')),
  size TEXT NOT NULL,
  neon_text TEXT,
  title TEXT,
  unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  original_image_url TEXT,
  original_storage_path TEXT,
  mockup_image_url TEXT,
  mockup_storage_path TEXT,
  enhanced_image_url TEXT,
  enhanced_storage_path TEXT,
  ai_provider TEXT,
  ai_action TEXT,
  ai_status TEXT NOT NULL DEFAULT 'none'
    CHECK (ai_status IN ('none', 'processing', 'ready', 'failed')),
  ai_notes TEXT,
  order_id UUID REFERENCES tinge_orders(id) ON DELETE SET NULL,
  order_number VARCHAR(50),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_cart', 'ordered', 'enhanced', 'ready_for_print', 'fulfilled', 'cancelled')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tinge_custom_art_status ON tinge_custom_art_requests(status);
CREATE INDEX IF NOT EXISTS idx_tinge_custom_art_order_id ON tinge_custom_art_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_tinge_custom_art_created_at ON tinge_custom_art_requests(created_at DESC);

DROP TRIGGER IF EXISTS trg_tinge_custom_art_updated_at ON tinge_custom_art_requests;
CREATE TRIGGER trg_tinge_custom_art_updated_at
  BEFORE UPDATE ON tinge_custom_art_requests
  FOR EACH ROW EXECUTE FUNCTION public.tinge_set_updated_at();

ALTER TABLE tinge_order_items
  ADD COLUMN IF NOT EXISTS custom_art_request_id UUID REFERENCES tinge_custom_art_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS custom_image_url TEXT,
  ADD COLUMN IF NOT EXISTS mockup_image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_tinge_order_items_custom_art ON tinge_order_items(custom_art_request_id);

ALTER TABLE tinge_custom_art_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service manage tinge_custom_art_requests" ON tinge_custom_art_requests;
CREATE POLICY "Service manage tinge_custom_art_requests"
  ON tinge_custom_art_requests FOR ALL USING (auth.role() = 'service_role');

-- Create dedicated public bucket for Your Art uploads, room mockups, and upscaled print files.
INSERT INTO storage.buckets (id, name, public)
VALUES ('custom-art', 'custom-art', true)
ON CONFLICT (id) DO NOTHING;
