-- =====================================================
-- Move Piletas from Artículos del hogar to Jardín
-- =====================================================

do $$
declare
  v_jardin_id uuid;
begin
  select id into v_jardin_id from categories where slug = 'jardin';

  update categories
  set parent_id = v_jardin_id
  where slug = 'piletas'
    and (parent_id is null or parent_id is distinct from v_jardin_id);
end $$;
