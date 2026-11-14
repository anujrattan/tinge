-- Create color_profiles table to store canonical color hex codes
-- Used to render accurate swatches across the app.

create table if not exists public.color_profiles (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  hex text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint color_profiles_name_unique unique (name),
  constraint color_profiles_hex_unique unique (hex),
  constraint color_profiles_hex_format check (hex ~* '^#[0-9a-f]{6}$')
);

-- Seed baseline profiles (from provider palette)
insert into public.color_profiles (name, hex)
values
  ('Almond', '#F8F0C6'),
  ('Black', '#202020'),
  ('Burgundy', '#3A131F'),
  ('Butter Yellow', '#FFFBA8'),
  ('Charcoal Grey', '#3E3433'),
  ('Chocolate Brown', '#895129'),
  ('Coffee Brown', '#693617'),
  ('Golden Yellow', '#FFB300'),
  ('Iris Lavender', '#BAA3DA'),
  ('Ivory', '#FFFFF0'),
  ('Light Pink', '#FFCFE7'),
  ('Liril Green', '#7BDE4E'),
  ('Maroon', '#650C17'),
  ('Melange Grey', '#AFAFAF'),
  ('Mustard Yellow', '#EB9B54'),
  ('Navy Blue', '#032D49'),
  ('Olive Green', '#193D24'),
  ('Orange', '#FF5E00'),
  ('Pastel Dusty', '#DCA1A1'),
  ('Purple', '#3F246A'),
  ('Red', '#CE051F'),
  ('Royal Blue', '#101C86'),
  ('Silver Frost', '#A0A5A9'),
  ('Sky Blue', '#1BCEFA'),
  ('Smoke Blue', '#4D608C'),
  ('Surf Blue', '#9DD6E1'),
  ('White', '#FFFFFF')
on conflict (name) do update
set hex = excluded.hex,
    updated_at = now();

