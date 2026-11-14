-- Add explicit size chart profile selector for products.
-- Keeps chart selection scalable and avoids brittle keyword-only matching.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS size_chart_profile TEXT;

COMMENT ON COLUMN products.size_chart_profile IS
  'Optional explicit size chart profile id (e.g., regular-tee, oversized-tee). If null, frontend falls back to keyword detection.';

