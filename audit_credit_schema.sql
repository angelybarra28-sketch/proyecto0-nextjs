-- =============================================================================
-- AUDITORÍA: Objetos de Cuenta Corriente (credit_*)
-- Proyecto: mtpgvidzwveelfjbdgoh
-- Ejecutar en Supabase SQL Editor (Service Role recomendado para evitar RLS)
-- =============================================================================
-- Este script verifica la existencia de todas las tablas, columnas, índices,
-- funciones, políticas (policies) y RLS que deberían existir según las
-- migraciones auditadas.
--
-- Migraciones auditadas:
--   1) 202606010002_credit_account_tables.sql
--   2) 202606010003_credit_installments.sql
--   3) 202606020001_credit_portfolio_update.sql
--   4) 202606020002_import_portfolio_row_rpc.sql
-- =============================================================================

-- Resultados se acumulan en esta tabla temporal
create temp table if not exists _audit_credit_results (
  category text not null,
  object_name text not null,
  status text not null check (status in ('OK','MISSING'))
);

truncate _audit_credit_results;

do $$
declare
  v_tbl text;
  v_col record;
  v_idx text;
  v_func text;
  v_pol record;
  v_rls text;
  v_exists boolean;
begin
  ---------------------------------------------------------------------------
  -- 1. TABLAS
  ---------------------------------------------------------------------------
  foreach v_tbl in array array[
    'credit_accounts',
    'credit_payments',
    'credit_installments',
    'credit_payment_allocations',
    'credit_collection_notes'
  ] loop
    v_exists := (to_regclass('public.' || v_tbl) is not null);
    insert into _audit_credit_results(category, object_name, status)
    values ('TABLE', v_tbl, case when v_exists then 'OK' else 'MISSING' end);
  end loop;

  ---------------------------------------------------------------------------
  -- 2. COLUMNAS ESPECÍFICAS (agregadas en migraciones posteriores)
  ---------------------------------------------------------------------------
  for v_col in
    select * from (values
      ('credit_accounts', 'operation_number'),
      ('credit_payments', 'payment_method')
    ) as required(table_name, column_name)
  loop
    select true into v_exists
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = v_col.table_name
      and c.column_name = v_col.column_name;

    insert into _audit_credit_results(category, object_name, status)
    values (
      'COLUMN',
      v_col.table_name || '.' || v_col.column_name,
      case when v_exists then 'OK' else 'MISSING' end
    );
  end loop;

  ---------------------------------------------------------------------------
  -- 3. ÍNDICES
  ---------------------------------------------------------------------------
  foreach v_idx in array array[
    'idx_credit_accounts_customer_id',
    'idx_credit_accounts_sale_date',
    'idx_credit_accounts_is_active',
    'idx_credit_accounts_operation_number',
    'idx_credit_payments_credit_account_id',
    'idx_credit_payments_payment_date',
    'idx_credit_payments_payment_method',
    'idx_credit_installments_account_id',
    'idx_credit_installments_due_date',
    'idx_credit_installments_status',
    'idx_credit_installments_status_due_date',
    'idx_credit_payment_allocations_payment_id',
    'idx_credit_payment_allocations_installment_id',
    'idx_credit_collection_notes_account_id',
    'idx_credit_collection_notes_created_at'
  ] loop
    select true into v_exists
    from pg_indexes
    where schemaname = 'public' and indexname = v_idx;

    insert into _audit_credit_results(category, object_name, status)
    values ('INDEX', v_idx, case when v_exists then 'OK' else 'MISSING' end);
  end loop;

  ---------------------------------------------------------------------------
  -- 4. FUNCIONES
  ---------------------------------------------------------------------------
  foreach v_func in array array[
    'get_credit_dashboard',
    'generate_credit_installments',
    'apply_credit_payment',
    'refresh_credit_overdue',
    'get_credit_collection_route',
    'import_credit_portfolio_row'
  ] loop
    select true into v_exists
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = v_func;

    insert into _audit_credit_results(category, object_name, status)
    values ('FUNCTION', v_func, case when v_exists then 'OK' else 'MISSING' end);
  end loop;

  ---------------------------------------------------------------------------
  -- 5. POLICIES (RLS policies)
  ---------------------------------------------------------------------------
  for v_pol in
    select * from (values
      ('credit_accounts', 'Admin can read credit accounts'),
      ('credit_payments', 'Admin can read credit payments'),
      ('credit_installments', 'Admin can read credit installments'),
      ('credit_payment_allocations', 'Admin can read credit payment allocations'),
      ('credit_collection_notes', 'Admin can read credit collection notes')
    ) as required(table_name, policy_name)
  loop
    select true into v_exists
    from pg_policies
    where schemaname = 'public'
      and tablename = v_pol.table_name
      and policyname = v_pol.policy_name;

    insert into _audit_credit_results(category, object_name, status)
    values (
      'POLICY',
      v_pol.table_name || ' -> ' || v_pol.policy_name,
      case when v_exists then 'OK' else 'MISSING' end
    );
  end loop;

  ---------------------------------------------------------------------------
  -- 6. RLS ENABLED en tablas
  ---------------------------------------------------------------------------
  foreach v_rls in array array[
    'credit_accounts',
    'credit_payments',
    'credit_installments',
    'credit_payment_allocations',
    'credit_collection_notes'
  ] loop
    select true into v_exists
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = v_rls
      and c.relrowsecurity = true;

    insert into _audit_credit_results(category, object_name, status)
    values ('RLS_ENABLED', v_rls, case when v_exists then 'OK' else 'MISSING' end);
  end loop;

  ---------------------------------------------------------------------------
  -- 7. DEPENDENCIAS EXTERNAS CRÍTICAS
  ---------------------------------------------------------------------------
  -- customers (confirmada existente por el usuario, pero auditamos igual)
  select true into v_exists
  from information_schema.tables
  where table_schema = 'public' and table_name = 'customers';
  insert into _audit_credit_results(category, object_name, status)
  values ('DEPENDENCY_TABLE', 'customers', case when v_exists then 'OK' else 'MISSING' end);

  -- profiles (necesaria para las policies ADMIN/STAFF)
  select true into v_exists
  from information_schema.tables
  where table_schema = 'public' and table_name = 'profiles';
  insert into _audit_credit_results(category, object_name, status)
  values ('DEPENDENCY_TABLE', 'profiles', case when v_exists then 'OK' else 'MISSING' end);

  -- app_role enum (usado en profiles.role y policies)
  select true into v_exists
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public' and t.typname = 'app_role';
  insert into _audit_credit_results(category, object_name, status)
  values ('DEPENDENCY_TYPE', 'app_role', case when v_exists then 'OK' else 'MISSING' end);
end $$;

-- =============================================================================
-- RESULTADO
-- =============================================================================
select
  category,
  object_name,
  status,
  case status
    when 'OK' then '✓'
    when 'MISSING' then '✗ FALTA'
  end as indicator
from _audit_credit_results
order by
  case category
    when 'DEPENDENCY_TABLE' then 1
    when 'DEPENDENCY_TYPE' then 2
    when 'TABLE' then 3
    when 'COLUMN' then 4
    when 'INDEX' then 5
    when 'FUNCTION' then 6
    when 'RLS_ENABLED' then 7
    when 'POLICY' then 8
  end,
  object_name;

-- =============================================================================
-- RESUMEN
-- =============================================================================
select
  category,
  count(*) filter (where status = 'MISSING') as missing_count,
  count(*) as total_count
from _audit_credit_results
where category not in ('DEPENDENCY_TABLE','DEPENDENCY_TYPE')
group by category
order by
  case category
    when 'TABLE' then 1
    when 'COLUMN' then 2
    when 'INDEX' then 3
    when 'FUNCTION' then 4
    when 'RLS_ENABLED' then 5
    when 'POLICY' then 6
  end;
