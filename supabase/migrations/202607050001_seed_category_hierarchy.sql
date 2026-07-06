-- =====================================================
-- Seed correct category hierarchy for BLANQUERIA
-- Based on user's confirmed structure
-- =====================================================

-- 0. Helper: function to get category ID by slug
-- (inline DO blocks used instead for compatibility)

-- 1. Ensure BLANQUERIA root exists
insert into categories (name, slug, description, sort_order, is_active)
values ('Blanquería', 'blanqueria', 'Ropa de cama, baño y textiles para el hogar', 1, true)
on conflict (slug) do nothing;

-- 2. Ensure madre categories exist under BLANQUERIA
-- (some may already exist from previous seed)
do $$
declare
  v_parent_id uuid;
begin
  select id into v_parent_id from categories where slug = 'blanqueria';

  -- Create any missing madre categories
  insert into categories (name, slug, description, parent_id, sort_order, is_active)
  values
    ('Sábanas', 'sabanas', 'Sábanas y juegos de sábanas', v_parent_id, 1, true),
    ('Invierno', 'invierno', 'Ropa y textiles para temporada de invierno', v_parent_id, 2, true),
    ('Verano', 'verano', 'Ropa y textiles para temporada de verano', v_parent_id, 3, true),
    ('Almohadas', 'almohadas', 'Almohadas y almohadones', v_parent_id, 4, true),
    ('Cortinas', 'cortinas', 'Cortinas y accesorios', v_parent_id, 5, true),
    ('Cocina', 'cocina', 'Textiles y accesorios para cocina', v_parent_id, 6, true),
    ('Baño', 'bano', 'Toallas, accesorios y textiles para baño', v_parent_id, 7, true),
    ('Toallones', 'toallones', 'Toallones y toallas', v_parent_id, 8, true),
    ('Infantil', 'infantil', 'Textiles infantiles', v_parent_id, 9, true),
    ('Batas', 'batas', 'Batas y prendas para el hogar', v_parent_id, 10, true)
  on conflict (slug) do nothing;

  -- Ensure existing madre categories are assigned to BLANQUERIA
  update categories set parent_id = v_parent_id
  where slug in (
    'sabanas', 'invierno', 'verano', 'almohadas', 'cortinas',
    'cocina', 'bano', 'toallones', 'infantil', 'batas'
  )
  and (parent_id is null or parent_id is distinct from v_parent_id);
end $$;

-- 3. Size subcategories under SABANAS (slug: sabanas)
do $$
declare
  v_parent_id uuid;
begin
  select id into v_parent_id from categories where slug = 'sabanas';

  insert into categories (name, slug, description, parent_id, sort_order, is_active)
  values
    ('1 1/2 Plaza', '1-1-2-plaza', 'Medida 1 1/2 plaza', v_parent_id, 1, true),
    ('2 1/2 Plaza', '2-1-2-plaza', 'Medida 2 1/2 plaza', v_parent_id, 2, true),
    ('Queen', 'queen', 'Medida Queen', v_parent_id, 3, true),
    ('King', 'king', 'Medida King', v_parent_id, 4, true),
    ('Infantil', 'infantil-sabanas', 'Medida Infantil', v_parent_id, 5, true)
  on conflict (slug) do nothing;
end $$;

-- 4. Size subcategories under INVIERNO (slug: invierno)
do $$
declare
  v_parent_id uuid;
begin
  select id into v_parent_id from categories where slug = 'invierno';

  insert into categories (name, slug, description, parent_id, sort_order, is_active)
  values
    ('1 1/2 Plaza', 'inv-1-1-2-plaza', 'Medida 1 1/2 plaza para invierno', v_parent_id, 1, true),
    ('2 1/2 Plaza', 'inv-2-1-2-plaza', 'Medida 2 1/2 plaza para invierno', v_parent_id, 2, true),
    ('Queen', 'inv-queen', 'Medida Queen para invierno', v_parent_id, 3, true),
    ('King', 'inv-king', 'Medida King para invierno', v_parent_id, 4, true),
    ('Infantil', 'inv-infantil', 'Medida Infantil para invierno', v_parent_id, 5, true)
  on conflict (slug) do nothing;
end $$;

-- 5. Size subcategories under VERANO (slug: verano)
do $$
declare
  v_parent_id uuid;
begin
  select id into v_parent_id from categories where slug = 'verano';

  insert into categories (name, slug, description, parent_id, sort_order, is_active)
  values
    ('1 1/2 Plaza', 'ver-1-1-2-plaza', 'Medida 1 1/2 plaza para verano', v_parent_id, 1, true),
    ('2 1/2 Plaza', 'ver-2-1-2-plaza', 'Medida 2 1/2 plaza para verano', v_parent_id, 2, true),
    ('Queen', 'ver-queen', 'Medida Queen para verano', v_parent_id, 3, true),
    ('King', 'ver-king', 'Medida King para verano', v_parent_id, 4, true),
    ('Infantil', 'ver-infantil', 'Medida Infantil para verano', v_parent_id, 5, true)
  on conflict (slug) do nothing;
end $$;

-- 6. Subcategories under CORTINAS (slug: cortinas)
do $$
declare
  v_parent_id uuid;
begin
  select id into v_parent_id from categories where slug = 'cortinas';

  insert into categories (name, slug, description, parent_id, sort_order, is_active)
  values
    ('Baño', 'cortina-bano', 'Cortinas para baño', v_parent_id, 1, true),
    ('Cocina', 'cortina-cocina', 'Cortinas para cocina', v_parent_id, 2, true),
    ('Ambiente', 'cortina-ambiente', 'Cortinas para ambiente', v_parent_id, 3, true)
  on conflict (slug) do nothing;
end $$;

-- 7. Subcategories under COCINA (slug: cocina)
do $$
declare
  v_parent_id uuid;
begin
  select id into v_parent_id from categories where slug = 'cocina';

  insert into categories (name, slug, description, parent_id, sort_order, is_active)
  values
    ('Manteles', 'manteles', 'Manteles para cocina', v_parent_id, 1, true),
    ('Repasadores', 'repasadores', 'Repasadores para cocina', v_parent_id, 2, true),
    ('Individuales', 'individuales', 'Individuales para cocina', v_parent_id, 3, true)
  on conflict (slug) do nothing;
end $$;

-- 8. Subcategories under BAÑO (slug: bano)
do $$
declare
  v_parent_id uuid;
  v_alfombras_id uuid;
  v_ganchos_id uuid;
begin
  select id into v_parent_id from categories where slug = 'bano';

  -- Move existing Alfombras and Ganchos under Baño
  update categories set parent_id = v_parent_id
  where slug in ('alfombras', 'ganchos')
  and parent_id is distinct from v_parent_id;

  -- Create Cortinas y Protectores
  insert into categories (name, slug, description, parent_id, sort_order, is_active)
  values ('Cortinas y Protectores', 'cortinas-protectores', 'Cortinas y protectores para baño', v_parent_id, 3, true)
  on conflict (slug) do nothing;
end $$;

-- 9. Subcategories under INFANTIL (slug: infantil)
do $$
declare
  v_parent_id uuid;
begin
  select id into v_parent_id from categories where slug = 'infantil';

  insert into categories (name, slug, description, parent_id, sort_order, is_active)
  values
    ('Sábanas', 'inf-sabanas', 'Sábanas infantiles', v_parent_id, 1, true),
    ('Toallas', 'inf-toallas', 'Toallas infantiles', v_parent_id, 2, true),
    ('Invierno', 'inf-invierno', 'Textiles de invierno infantiles', v_parent_id, 3, true),
    ('Verano', 'inf-verano', 'Textiles de verano infantiles', v_parent_id, 4, true)
  on conflict (slug) do nothing;
end $$;

-- =====================================================
-- REASIGNAR productos de categorías viejas a nuevas
-- =====================================================

-- Productos de Frazadas → Invierno
update products set category_id = (select id from categories where slug = 'invierno')
where category_id = (select id from categories where slug = 'frazadas');

-- Productos de Acolchados → Invierno
update products set category_id = (select id from categories where slug = 'invierno')
where category_id = (select id from categories where slug = 'acolchados');

-- Productos de Colchas y Cubrecamas → Verano
update products set category_id = (select id from categories where slug = 'verano')
where category_id in (
  select id from categories where slug in ('colchas', 'cubrecamas')
);

-- Productos de Mantelería → Cocina (subcategoría Manteles)
update products set category_id = (select id from categories where slug = 'manteles')
where category_id = (select id from categories where slug = 'manteleria');

-- Productos de Mantas → Verano
update products set category_id = (select id from categories where slug = 'verano')
where category_id = (select id from categories where slug = 'mantas');

-- =====================================================
-- DESACTIVAR categorías viejas que ya no se usan
-- =====================================================
update categories set is_active = false
where slug in (
  'frazadas', 'acolchados', 'colchas', 'cubrecamas',
  'manteleria', 'mantas', '1-12-plz'
);

-- =====================================================
-- LIMPIEZA FINAL
-- =====================================================

-- Eliminar categoría duplicada "1 1/2 plz" (ya reemplazada por "1 1/2 Plaza")
-- Solo si no tiene productos asociados (ya verificado)
delete from categories where slug = '1-12-plz';

-- Eliminar "Artículos del hogar" duplicado (slug: articulos-del-hogar-sub)
-- Solo si no tiene productos asociados
update categories set is_active = false where slug = 'articulos-del-hogar-sub';
