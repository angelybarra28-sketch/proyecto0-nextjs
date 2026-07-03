-- Seed additional Blanquería subcategories requested by the admin
-- Adds: Alfombras, Batas, Verano, Invierno, Infantil, Cocina, Baño, Colchas, Otros, Mantas, Ganchos

insert into categories (name, slug, description, sort_order, is_active) values
  ('Alfombras', 'alfombras', 'Alfombras y alfombras de todos los tamaños', 9, true),
  ('Batas', 'batas', 'Batas y prendas para el hogar', 10, true),
  ('Verano', 'verano', 'Ropa y textiles para temporada de verano', 11, true),
  ('Invierno', 'invierno', 'Ropa y textiles para temporada de invierno', 12, true),
  ('Infantil', 'infantil', 'Textiles infantiles y ropa para niños', 13, true),
  ('Cocina', 'cocina', 'Textiles y accesorios para cocina', 14, true),
  ('Baño', 'bano', 'Toallas, accesorios y textiles para baño', 15, true),
  ('Colchas', 'colchas', 'Colchas y cubrecamas', 16, true),
  ('Otros', 'otros', 'Otras categorías de blanquería', 17, true),
  ('Mantas', 'mantas', 'Mantas y frazadas adicionales', 18, true),
  ('Ganchos', 'ganchos', 'Ganchos y accesorios para colgar textiles', 19, true)
on conflict (slug) do nothing;
