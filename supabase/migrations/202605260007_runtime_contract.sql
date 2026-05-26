create or replace function validate_runtime_contract()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_missing_tables text[] := array[]::text[];
  v_missing_columns text[] := array[]::text[];
  v_missing_functions text[] := array[]::text[];
  v_missing_extensions text[] := array[]::text[];
  v_table text;
  v_column record;
  v_function text;
begin
  if not exists (select 1 from pg_extension where extname = 'pgcrypto') then
    v_missing_extensions := array_append(v_missing_extensions, 'pgcrypto');
  end if;

  if not exists (select 1 from pg_extension where extname = 'pg_trgm') then
    v_missing_extensions := array_append(v_missing_extensions, 'pg_trgm');
  end if;

  foreach v_table in array array['categories','products','customers','profiles','sales','sale_items','installments','payments','payment_allocations','admin_audit_logs'] loop
    if to_regclass('public.' || v_table) is null then
      v_missing_tables := array_append(v_missing_tables, v_table);
    end if;
  end loop;

  for v_column in
    select * from (values
      ('products', 'legacy_product_id'),
      ('products', 'slug'),
      ('products', 'status'),
      ('sales', 'checkout_request_id'),
      ('sales', 'collection_status'),
      ('installments', 'remaining_amount'),
      ('installments', 'due_date'),
      ('payments', 'payment_request_id'),
      ('payments', 'payment_method'),
      ('payment_allocations', 'payment_id'),
      ('admin_audit_logs', 'action')
    ) as required(table_name, column_name)
  loop
    if not exists (
      select 1 from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = v_column.table_name
        and c.column_name = v_column.column_name
    ) then
      v_missing_columns := array_append(v_missing_columns, v_column.table_name || '.' || v_column.column_name);
    end if;
  end loop;

  foreach v_function in array array['create_checkout_sale','register_sale_payment','refresh_financial_statuses','get_admin_dashboard_analytics'] loop
    if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = v_function) then
      v_missing_functions := array_append(v_missing_functions, v_function);
    end if;
  end loop;

  return jsonb_build_object(
    'ok', cardinality(v_missing_tables) = 0 and cardinality(v_missing_columns) = 0 and cardinality(v_missing_functions) = 0 and cardinality(v_missing_extensions) = 0,
    'missingExtensions', v_missing_extensions,
    'missingTables', v_missing_tables,
    'missingColumns', v_missing_columns,
    'missingFunctions', v_missing_functions
  );
end;
$$;
