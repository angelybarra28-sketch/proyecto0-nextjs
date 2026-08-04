-- =============================================================================
-- ETAPA B1 — VERIFICACIÓN CONTRA BASE REAL DE SUPABASE (READ ONLY)
-- =============================================================================
-- Proyecto: mtpgvidzwveelfjbdgoh (proyecto0-nextjs)
-- Objetivo: Validar los hallazgos de ETAPA B con evidencia de la base real.
--           #################################################################
--           #  NO MODIFICA NADA: 100% consultas SELECT sobre pg_catalog,   #
--           #  information_schema y storage. No usa DML ni DDL.            #
--           #################################################################
-- Ejecutar en: Supabase SQL Editor (rol postgres o service_role).
--
-- Contenido: 12 consultas de auditoría (Q1..Q12).
--   Q1  -> Estructura real de `products` (objetivo 1)
--   Q2  -> Inventario de objetos para comparar contra `schema.sql` y
--          generar el inventario final (objetivos 2 y 14)
--   Q3  -> Triggers y función `handle_new_auth_user` (objetivo 3)
--   Q4  -> Inventario completo de policies RLS (objetivo 4)
--   Q5  -> Storage: buckets y policies (objetivo 5)
--   Q6  -> Inventario de funciones/RPC + definiciones de funciones críticas
--          (objetivo 6)
--   Q7  -> Foreign keys reales (objetivo 7)
--   Q8  -> Índices: inventario + uso (objetivo 8)
--   Q9  -> Constraints CHECK / UNIQUE / PRIMARY (objetivo 9)
--   Q10 -> Grants a anon / authenticated / service_role (objetivo 10)
--   Q11 -> Funciones SECURITY DEFINER: owner, search_path, permisos
--          (objetivo 11)
--   Q12 -> RLS por tabla y tablas sin RLS (objetivo 12)
--
-- Los objetivos 13 (inconsistencias BD vs migraciones vs schema.sql vs código)
-- y 14 (inventario final) se derivan en el informe ETAPA_B1 a partir de la
-- salida de estas consultas, comparándola contra los archivos locales.
-- =============================================================================

-- =============================================================================
-- Q1. ESTRUCTURA REAL DE `products` (objetivo 1)
-- -----------------------------------------------------------------------------
-- Valida si `reference_price` y `tendencias` existen, su tipo, nullabilidad
-- y default. La comparación contra migraciones y schema.sql se hace en el
-- informe (client-side), con esta salida como evidencia.
-- =============================================================================
select
  column_name,
  data_type,
  udt_name,
  is_nullable,
  coalesce(column_default, '') as column_default,
  character_maximum_length
from information_schema.columns
where table_schema = 'public'
  and table_name = 'products'
order by ordinal_position;

-- Enum del status de productos (para contrastar con migraciones)
select
  t.typname as enum_name,
  e.enumlabel as enum_value,
  e.enumsortorder
from pg_type t
join pg_enum e on e.enumtypid = t.oid
where t.typname in ('product_status')
order by e.enumsortorder;

-- =============================================================================
-- Q2. INVENTARIO DE OBJETOS PARA COMPARAR CONTRA `schema.sql` (objetivos 2 y 14)
-- -----------------------------------------------------------------------------
-- Tablas, vistas, secuencias y enums reales de `public`. El informe cruza esta
-- salida con el DDL de schema.sql y de las migraciones para listar qué
-- reconstruye schema.sql y qué no.
-- =============================================================================
select 'table' as obj_kind, n.nspname as obj_schema, c.relname as obj_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
union all
select 'view', n.nspname, c.relname
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'v'
union all
select 'sequence', n.nspname, c.relname
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'S'
order by 1, 3;

-- Tipos enum reales de `public`
select
  t.typname as enum_name,
  string_agg(e.enumlabel, ', ' order by e.enumsortorder) as enum_values
from pg_type t
join pg_enum e on e.enumtypid = t.oid
where t.typnamespace = 'public'::regnamespace
group by t.typname
order by t.typname;

-- =============================================================================
-- Q3. TRIGGERS Y FUNCIÓN `handle_new_auth_user` (objetivo 3)
-- -----------------------------------------------------------------------------
-- Verifica si el trigger de creación automática de profiles existe, sobre qué
-- tabla, quién lo creó (owner) y su definición. También lista todos los
-- triggers no internos del esquema public/auth.
-- =============================================================================
select
  n.nspname as schema,
  c.relname as table_name,
  pg_get_userbyid(c.relowner) as table_owner,
  tg.tgname as trigger_name,
  tg.tgenabled as enabled,
  p.proname as function_name
from pg_trigger tg
join pg_class c on c.oid = tg.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = tg.tgfoid
where not tg.tgisinternal
  and n.nspname in ('public', 'auth')
order by n.nspname, c.relname, tg.tgname;

-- Detalle específico: ¿existe handle_new_auth_user? ¿Qué trigger la usa?
select
  p.proname as function_name,
  pg_get_userbyid(p.proowner) as owner,
  l.lanname as language,
  pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_language l on l.oid = p.prolang
where n.nspname = 'public'
  and p.proname in ('handle_new_auth_user');

-- =============================================================================
-- Q4. INVENTARIO COMPLETO DE POLICIES RLS (objetivo 4)
-- -----------------------------------------------------------------------------
-- Para cada tabla con policies: RLS se ve en Q12; aquí la policy completa con
-- roles aplicables, comando y expresiones USING / WITH CHECK.
-- =============================================================================
select
  schemaname as schema,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

-- =============================================================================
-- Q5. STORAGE: BUCKETS Y POLICIES (objetivo 5)
-- -----------------------------------------------------------------------------
-- Confirma si `proveedor-adjuntos` es público y cuáles son sus policies
-- (incluida la visibilidad de roles en la policy de storage.objects).
-- =============================================================================
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
order by name;

select
  tablename,
  policyname,
  roles,
  cmd,
  qual as using_expression,
  with_check
from pg_policies
where schemaname = 'storage'
order by tablename, policyname;

-- =============================================================================
-- Q6. INVENTARIO DE FUNCIONES / RPC (objetivo 6)
-- -----------------------------------------------------------------------------
-- Todas las funciones de `public` con argumentos, retorno, lenguaje, flag
-- SECURITY DEFINER, volatilidad, owner y search_path. Permite detectar RPC
-- huérfanas (en DB pero sin uso en la app), creadas manualmente o faltantes
-- respecto a las migraciones (comparación en el informe).
-- =============================================================================
select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as returns,
  l.lanname as language,
  p.prosecdef as security_definer,
  p.provolatile as volatility,
  pg_get_userbyid(p.proowner) as owner,
  coalesce(array_to_string(p.proconfig, ', '), '') as config_search_path
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_language l on l.oid = p.prolang
where n.nspname = 'public'
order by p.proname;

-- Definiciones completas de las funciones críticas (evidencia para los
-- hallazgos C1, C6, C8, C10, C12)
select
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'create_checkout_sale',
    'register_sale_payment',
    'get_sales_paginated',
    'handle_new_auth_user',
    'insert_and_validate_pago',
    'get_credit_dashboard',
    'import_credit_portfolio_row',
    'register_credit_payment',
    'apply_credit_payment',
    'generate_credit_installments',
    'refresh_credit_overdue',
    'validate_runtime_contract'
  )
order by p.proname;

-- =============================================================================
-- Q7. FOREIGN KEYS REALES (objetivo 7)
-- -----------------------------------------------------------------------------
-- Todas las FK del esquema `public`. El informe las compara contra lo que
-- valida validate.service.ts / backup para detectar cuáles no se auditan.
-- =============================================================================
select
  conrelid::regclass::text as table_name,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where contype = 'f'
  and connamespace = 'public'::regnamespace
order by 1, 2;

-- =============================================================================
-- Q8. ÍNDICES: INVENTARIO + USO (objetivo 8)
-- -----------------------------------------------------------------------------
-- Inventario completo (columnas, unicidad vía indexdef) y estadísticas de uso
-- para detectar índices duplicados, faltantes o nunca utilizados.
-- =============================================================================
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- Uso de índices (idx_scan = 0 => candidato a nunca utilizado)
select
  schemaname,
  relname as table_name,
  indexrelname as index_name,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
from pg_stat_user_indexes
where schemaname = 'public'
order by idx_scan asc, indexrelname;

-- =============================================================================
-- Q9. CONSTRAINTS CHECK / UNIQUE / PRIMARY (objetivo 9)
-- -----------------------------------------------------------------------------
-- Inventario de constraints de `public` con su definición para comparar
-- contra las migraciones.
-- =============================================================================
select
  conrelid::regclass::text as table_name,
  case contype
    when 'c' then 'CHECK'
    when 'u' then 'UNIQUE'
    when 'p' then 'PRIMARY KEY'
  end as constraint_type,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where connamespace = 'public'::regnamespace
  and contype in ('c', 'u', 'p')
order by 1, 2, 3;

-- =============================================================================
-- Q10. GRANTS A anon / authenticated / service_role (objetivo 10)
-- -----------------------------------------------------------------------------
-- Permisos reales por tabla y por función para los tres roles de PostgREST.
-- Detección de GRANT peligrosos (p.ej. INSERT/UPDATE/DELETE a anon o
-- EXECUTE amplio sobre funciones SECURITY DEFINER).
-- =============================================================================
select
  c.relname as table_name,
  has_table_privilege('anon', c.oid, 'SELECT')     as anon_sel,
  has_table_privilege('anon', c.oid, 'INSERT')     as anon_ins,
  has_table_privilege('anon', c.oid, 'UPDATE')     as anon_upd,
  has_table_privilege('anon', c.oid, 'DELETE')     as anon_del,
  has_table_privilege('authenticated', c.oid, 'SELECT') as auth_sel,
  has_table_privilege('authenticated', c.oid, 'INSERT') as auth_ins,
  has_table_privilege('authenticated', c.oid, 'UPDATE') as auth_upd,
  has_table_privilege('authenticated', c.oid, 'DELETE') as auth_del,
  has_table_privilege('service_role', c.oid, 'SELECT')  as svc_sel,
  has_table_privilege('service_role', c.oid, 'INSERT')  as svc_ins,
  has_table_privilege('service_role', c.oid, 'UPDATE')  as svc_upd,
  has_table_privilege('service_role', c.oid, 'DELETE')  as svc_del
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;

-- Grants de ejecución de funciones (complemento de Q6/Q11)
select
  p.proname as function_name,
  has_function_privilege('anon', p.oid, 'EXECUTE')          as anon_exec,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec,
  has_function_privilege('service_role', p.oid, 'EXECUTE')  as svc_exec
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;

-- =============================================================================
-- Q11. FUNCIONES SECURITY DEFINER: owner, search_path, permisos (objetivo 11)
-- -----------------------------------------------------------------------------
-- Cada función con prosecdef = true: owner (quién "corre" como), search_path
-- efectivo, volatilidad y a qué roles se les concedió EXECUTE. Base para el
-- análisis de riesgo de cada RPC.
-- =============================================================================
select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_userbyid(p.proowner) as owner,
  coalesce(array_to_string(p.proconfig, ', '), '') as config_search_path,
  p.provolatile as volatility,
  has_function_privilege('anon', p.oid, 'EXECUTE')          as anon_exec,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec,
  has_function_privilege('service_role', p.oid, 'EXECUTE')  as svc_exec
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef = true
order by p.proname;

-- =============================================================================
-- Q12. RLS POR TABLA Y TABLAS SIN RLS (objetivo 12)
-- -----------------------------------------------------------------------------
-- Estado de RLS (relrowsecurity) y número de policies por tabla. Las tablas
-- con rls_enabled = false son candidatas a "debería tener RLS" (decisión del
-- informe según la sensibilidad de sus datos). Las que tienen RLS=true pero
-- policy_count = 0 quedan cerradas por defecto (default deny).
-- =============================================================================
select
  n.nspname as schema,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced,
  count(p.policyname)::int as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p
  on p.schemaname = n.nspname and p.tablename = c.relname
where n.nspname = 'public'
  and c.relkind = 'r'
group by n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
order by c.relname;

-- =============================================================================
-- FIN DEL SCRIPT — 12 CONSULTAS DE AUDITORÍA (READ ONLY)
-- =============================================================================
