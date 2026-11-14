-- Oversized tee color profiles (name + hex only; full palette from provider)

insert into public.color_profiles (name, hex)
values
  ('Ash Grey', '#c9c9c9'),
  ('Beige', '#e9d3c0'),
  ('Black', '#202020'),
  ('Brick Red', '#ee4432'),
  ('Forest Green', '#4e6745'),
  ('Ivory', '#fffff0'),
  ('Navy Blue', '#062646'),
  ('Red', '#ce0511'),
  ('White', '#ffffff')
on conflict (name) do update
set hex = excluded.hex,
    updated_at = now();
