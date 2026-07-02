insert into categories (name, slug, description, sort_order, is_active) values
  ('Cortinas', 'cortinas', 'Cortinas, persianas y accesorios', 9, true)
on conflict (slug) do nothing;
