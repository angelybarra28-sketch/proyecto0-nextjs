-- Script independiente: crear RPC import_credit_portfolio_row
-- Verifica dependencias antes de crear la función

DO $$
DECLARE
  v_missing text := '';
BEGIN
  IF to_regclass('public.credit_accounts') IS NULL THEN
    v_missing := v_missing || 'credit_accounts; ';
  END IF;
  IF to_regclass('public.credit_installments') IS NULL THEN
    v_missing := v_missing || 'credit_installments; ';
  END IF;
  IF to_regclass('public.credit_payment_allocations') IS NULL THEN
    v_missing := v_missing || 'credit_payment_allocations; ';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'credit_accounts' AND column_name = 'operation_number'
  ) THEN
    v_missing := v_missing || 'credit_accounts.operation_number; ';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'generate_credit_installments'
  ) THEN
    v_missing := v_missing || 'generate_credit_installments; ';
  END IF;

  IF v_missing <> '' THEN
    RAISE EXCEPTION 'Dependencias faltantes: %', v_missing;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION import_credit_portfolio_row(p_data jsonb)
RETURNS TABLE (
  credit_account_id uuid,
  customer_id uuid,
  payments_imported integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
  v_credit_account_id uuid;
  v_payment jsonb;
  v_payment_id uuid;
  v_remaining_to_allocate numeric(12, 2);
  v_allocation_amount numeric(12, 2);
  v_installment record;
  v_payments_count integer := 0;
  v_phone text;
  v_full_name text;
BEGIN
  -- normalize customer inputs from camelCase payload
  v_phone := nullif(trim(p_data->>'customerPhone'), '');
  v_full_name := nullif(trim(p_data->>'customerFullName'), '');

  -- find by phone
  if v_phone is not null then
    select id into v_customer_id from customers where phone = v_phone limit 1;
  end if;

  -- find by full_name if no phone match
  if v_customer_id is null and v_full_name is not null then
    select id into v_customer_id from customers where full_name = v_full_name limit 1;
  end if;

  -- create customer if not found
  if v_customer_id is null then
    insert into customers (
      full_name,
      phone,
      address,
      city,
      notes
    ) values (
      coalesce(v_full_name, 'Cliente sin nombre'),
      v_phone,
      nullif(trim(p_data->>'customerAddress'), ''),
      nullif(trim(p_data->>'betweenStreets'), ''),
      nullif(trim(p_data->>'betweenStreets'), '')
    )
    returning id into v_customer_id;
  end if;

  -- insert credit account (camelCase keys)
  insert into credit_accounts (
    customer_id,
    operation_number,
    product_name,
    quantity,
    installment_count,
    installment_amount,
    sale_date,
    notes
  ) values (
    v_customer_id,
    nullif(trim(p_data->>'operationNumber'), ''),
    coalesce(nullif(trim(p_data->>'productName'), ''), 'Artículo no especificado'),
    1,
    (p_data->>'installmentCount')::integer,
    (p_data->>'installmentAmount')::numeric,
    coalesce((p_data->>'saleDate')::date, current_date),
    nullif(trim(p_data->>'notes'), '')
  )
  returning id into v_credit_account_id;

  -- generate installments
  perform generate_credit_installments(
    v_credit_account_id,
    (p_data->>'installmentCount')::integer,
    (p_data->>'installmentAmount')::numeric,
    coalesce((p_data->>'saleDate')::date, current_date)
  );

  -- process historical payments (camelCase keys inside payment objects)
  for v_payment in select value from jsonb_array_elements(p_data->'payments') loop
    insert into credit_payments (
      credit_account_id,
      amount,
      payment_date,
      payment_method,
      notes
    ) values (
      v_credit_account_id,
      (v_payment->>'amount')::numeric,
      (v_payment->>'paymentDate')::date,
      coalesce(nullif(trim(v_payment->>'paymentMethod'), ''), 'EFECTIVO'),
      nullif(trim(v_payment->>'notes'), '')
    )
    returning id into v_payment_id;

    v_remaining_to_allocate := (v_payment->>'amount')::numeric;

    for v_installment in
      select * from credit_installments
      where credit_account_id = v_credit_account_id
        and remaining_amount > 0
      order by installment_number asc
      for update
    loop
      exit when v_remaining_to_allocate <= 0;

      v_allocation_amount := least(v_remaining_to_allocate, v_installment.remaining_amount);

      insert into credit_payment_allocations (
        credit_payment_id,
        credit_installment_id,
        amount
      ) values (
        v_payment_id,
        v_installment.id,
        v_allocation_amount
      );

      update credit_installments
      set
        paid_amount = paid_amount + v_allocation_amount,
        remaining_amount = remaining_amount - v_allocation_amount,
        status = case when remaining_amount - v_allocation_amount = 0 then 'PAID' else 'PARTIAL' end,
        updated_at = now()
      where id = v_installment.id;

      v_remaining_to_allocate := v_remaining_to_allocate - v_allocation_amount;
    end loop;

    v_payments_count := v_payments_count + 1;
  end loop;

  return query select v_credit_account_id, v_customer_id, v_payments_count;
END;
$$;
