-- =====================================================
-- Add Belleza y cuidado personal under Artículos del hogar
-- =====================================================

do $$
declare
  v_parent_id uuid;
  v_max_order integer;
begin
  select id into v_parent_id from categories where slug = 'articulos-del-hogar';

  select coalesce(max(sort_order), 0) + 1 into v_max_order
  from categories where parent_id = v_parent_id;

  insert into categories (name, slug, description, parent_id, sort_order, is_active)
  values (
    'Belleza y cuidado personal',
    'belleza-y-cuidado-personal',
    'Productos de belleza, cosmética y cuidado personal',
    v_parent_id,
    v_max_order,
    true
  )
  on conflict (slug) do update set
    parent_id = v_parent_id,
    sort_order = v_max_order,
    is_active = true;
end $$;
