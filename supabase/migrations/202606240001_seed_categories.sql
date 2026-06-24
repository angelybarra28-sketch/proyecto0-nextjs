-- Seed categories for the bedding/linen store
-- This ensures the admin product forms have categories to select from.

insert into categories (name, slug, description, sort_order, is_active) values
  ('Sábanas', 'sabanas', 'Sábanas y juegos de sábanas en todas las medidas', 1, true),
  ('Acolchados', 'acolchados', 'Acolchados y edredones', 2, true),
  ('Frazadas', 'frazadas', 'Frazadas y mantas', 3, true),
  ('Almohadas', 'almohadas', 'Almohadas y almohadones', 4, true),
  ('Cubrecamas', 'cubrecamas', 'Cubrecamas y tapices', 5, true),
  ('Toallones', 'toallones', 'Toallones y toallas', 6, true),
  ('Mantelería', 'manteleria', 'Manteles y camino de mesa', 7, true),
  ('Colchones', 'colchones', 'Colchones y bases', 8, true)
on conflict (slug) do nothing;
