-- =====================================================
-- Seed categories under ARTÍCULOS DEL HOGAR
-- =====================================================

do $$
declare
  v_parent_id uuid;
begin
  -- Ensure Artículos del hogar root exists and is active
  insert into categories (name, slug, description, sort_order, is_active)
  values ('Artículos del hogar', 'articulos-del-hogar', 'Electrodomésticos, herramientas, jardín y más', 2, true)
  on conflict (slug) do update set is_active = true;

  select id into v_parent_id from categories where slug = 'articulos-del-hogar';

  -- Create categories under Artículos del hogar
  insert into categories (name, slug, description, parent_id, sort_order, is_active)
  values
    ('TV', 'tv', 'Televisores y accesorios', v_parent_id, 1, true),
    ('Celulares', 'celulares', 'Teléfonos móviles y accesorios', v_parent_id, 2, true),
    ('Climatización', 'climatizacion', 'Aires acondicionados, ventiladores y calefacción', v_parent_id, 3, true),
    ('Electrodomésticos', 'electrodomesticos', 'Heladeras, lavarropas, cocinas y más', v_parent_id, 4, true),
    ('Herramientas', 'herramientas', 'Herramientas manuales y eléctricas', v_parent_id, 5, true),
    ('Lavado', 'lavado', 'Lavarropas, secarropas y productos para lavado', v_parent_id, 6, true),
    ('Jardín', 'jardin', 'Jardinería, muebles de exterior y parrillas', v_parent_id, 7, true),
    ('Otros', 'otros', 'Otros artículos para el hogar', v_parent_id, 8, true)
  on conflict (slug) do update set
    parent_id = v_parent_id,
    sort_order = excluded.sort_order,
    is_active = true;
end $$;
