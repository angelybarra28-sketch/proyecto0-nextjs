-- Migration: Tolerate overpayment in import_credit_portfolio_row
-- When historical payments exceed total installments (rounding, extra payments, etc.),
-- the import should succeed instead of raising an exception.
-- The excess amount is simply not allocated to any installment.

CREATE OR REPLACE FUNCTION import_credit_portfolio_row(p_data jsonb)
RETURNS TABLE (
  credit_account_id uuid,
  customer_id uuid,
  payments_imported integer
)
LANGUAGE PLPGSQL
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
  v_phone := nullif(trim(p_data->'customer'->>'phone'), '');
  v_full_name := nullif(trim(p_data->'customer'->>'full_name'), '');

  if v_phone is not null then
    select id into v_customer_id from customers where phone = v_phone limit 1;
  end if;

  if v_customer_id is null and v_full_name is not null then
    select id into v_customer_id from customers where full_name = v_full_name limit 1;
  end if;

  if v_customer_id is null then
    insert into customers (
      full_name, phone, address, city, notes
    ) values (
      coalesce(v_full_name, 'Cliente sin nombre'),
      v_phone,
      nullif(trim(p_data->'customer'->>'address'), ''),
      nullif(trim(p_data->'customer'->>'between_streets'), ''),
      nullif(trim(p_data->'customer'->>'between_streets'), '')
    )
    returning id into v_customer_id;
  end if;

  insert into credit_accounts (
    customer_id,
    operation_number,
    product_name,
    quantity,
    installment_count,
    installment_amount,
    sale_date,
    notes,
    origin_month,
    origin_year
  ) values (
    v_customer_id,
    nullif(trim(p_data->>'operation_number'), ''),
    coalesce(nullif(trim(p_data->>'product_name'), ''), 'Artículo no especificado'),
    1,
    (p_data->>'installment_count')::integer,
    (p_data->>'installment_amount')::numeric,
    coalesce((p_data->>'sale_date')::date, current_date),
    nullif(trim(p_data->>'notes'), ''),
    (p_data->>'origin_month')::integer,
    (p_data->>'origin_year')::integer
  )
  returning id into v_credit_account_id;

  perform generate_credit_installments(
    v_credit_account_id,
    (p_data->>'installment_count')::integer,
    (p_data->>'installment_amount')::numeric,
    coalesce((p_data->>'sale_date')::date, current_date)
  );

  for v_payment in select value from jsonb_array_elements(p_data->'payments') loop
    insert into credit_payments (
      credit_account_id, amount, payment_date, payment_method, notes
    ) values (
      v_credit_account_id,
      (v_payment->>'amount')::numeric,
      (v_payment->>'payment_date')::date,
      coalesce(nullif(trim(v_payment->>'payment_method'), ''), 'EFECTIVO'),
      nullif(trim(v_payment->>'notes'), '')
    )
    returning id into v_payment_id;

    v_remaining_to_allocate := (v_payment->>'amount')::numeric;

    for v_installment in
      select * from credit_installments ci
      where ci.credit_account_id = v_credit_account_id
        and ci.remaining_amount > 0
      order by ci.installment_number asc
      for update
    loop
      exit when v_remaining_to_allocate <= 0;

      v_allocation_amount := least(v_remaining_to_allocate, v_installment.remaining_amount);

      insert into credit_payment_allocations (
        credit_payment_id, credit_installment_id, amount
      ) values (
        v_payment_id, v_installment.id, v_allocation_amount
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

    -- Overpayment tolerance: if there is unallocated money left after all installments are
    -- fully paid, we simply ignore it instead of raising an exception. This handles rounding
    -- differences and extra payments gracefully.

    v_payments_count := v_payments_count + 1;
  end loop;

  return query select v_credit_account_id, v_customer_id, v_payments_count;
END;
$$;

-- Revoke public execution
REVOKE EXECUTE ON FUNCTION import_credit_portfolio_row(jsonb) FROM anon, authenticated;