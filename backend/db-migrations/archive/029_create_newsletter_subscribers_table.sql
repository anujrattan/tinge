-- Migration: Newsletter / community email subscribers
-- Description: Stores marketing list signups from homepage, footer, etc.
-- Date: 2026-06-10

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'homepage',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT newsletter_subscribers_email_unique UNIQUE (email),
  CONSTRAINT newsletter_subscribers_email_format CHECK (
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  )
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_active_subscribed
  ON newsletter_subscribers (is_active, subscribed_at DESC);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_source
  ON newsletter_subscribers (source);

COMMENT ON TABLE newsletter_subscribers IS 'Marketing newsletter / drop-list email subscribers.';
COMMENT ON COLUMN newsletter_subscribers.source IS 'Signup origin: homepage, footer, checkout, etc.';
COMMENT ON COLUMN newsletter_subscribers.is_active IS 'FALSE when user unsubscribes; email kept for compliance.';
