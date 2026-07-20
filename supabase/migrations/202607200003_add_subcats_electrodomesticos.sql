-- =====================================================
-- Add subcategories under Electrodomésticos
-- =====================================================

do $$
declare
  v_parent_id uuid;
  v_max_order integer;
begin
  select id into v_parent_id from categories where slug = 'electrodomesticos';

  select coalesce(max(sort_order), 0) + 1 into v_max_order
  from categories where parent_id = v_parent_id;

  insert into categories (name, slug, description, parent_id, sort_order, is_active)
  values
    ('Pequeños de cocina', 'pequenos-cocina', 'Licuadoras, batidoras, tostadoras y más', v_parent_id, v_max_order, true),
    ('Pequeños Hogar', 'pequenos-hogar', 'Aspiradoras, planchas, cafeteras y más', v_parent_id, v_max_order + 1, true),
    ('Termotanque Calefon', 'termotanque-calefon', 'Calefones, termotanques y accesorios', v_parent_id, v_max_order + 2, true),
    ('Cocinas', 'cocinas', 'Cocinas, hornos, anafes y campanas', v_parent_id, v_max_order + 3, true),
    ('Heladeras', 'heladeras-electro', 'Heladeras, freezers y conservadoras', v_parent_id, v_max_order + 4, true)
  on conflict (slug) do update set
    parent_id = v_parent_id,
    sort_order = excluded.sort_order,
    is_active = true;
end $$;
