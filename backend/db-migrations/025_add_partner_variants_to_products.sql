-- Add partner_variants JSONB column to products table.
-- Stores per-size Printrove variant details: [{size, partner_variant_id, partner_sku}]
-- This is additive only — no existing columns or data are touched.

alter table public.products
  add column if not exists partner_variants jsonb null default '[]'::jsonb;

comment on column public.products.partner_variants is
  'Printrove variant mapping per size: [{size: "S", partner_variant_id: "abc", partner_sku: "TH-BLK-S"}, ...]';
