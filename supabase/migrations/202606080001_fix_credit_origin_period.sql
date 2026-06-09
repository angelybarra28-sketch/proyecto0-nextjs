-- Migration: Fix credit origin period functions and ensure origin persistence
-- CR-003 / 2026-06-08
--
-- Scope:
--   1. Ensure origin_month / origin_year columns exist on credit_accounts.
--   2. Recreate import_credit_portfolio_row() to persist origin_month / origin_year from payload.
--   3. Recreate get_credit_commercial_metrics() so monthly_replacement uses ONLY origin_month / origin_year.
--   4. Recreate get_credit_monthly_control() so status 'Nueva' depends ONLY on origin_month / origin_year.
--   5. Revoke public execution.
--
-- This migration does NOT backfill existing rows automatically to avoid writing
-- import-date sale_date values into origin_period. Use the companion backfill
-- script (backfill_credit_origin_period.sql) to assign historical origin data.

-- 1. Schema safety
ALTER TABLE credit_accounts
ADD COLUMN IF NOT EXISTS origin_month integer,
ADD COLUMN IF NOT EXISTS origin_year integer;

CREATE INDEX IF NOT EXISTS idx_credit_accounts_origin_period
ON credit_accounts(origin_year, origin_month);

-- 2. Fix import RPC: explicitly persist origin_month / origin_year from payload
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
      select * from credit_installments
      where credit_account_id = v_credit_account_id
        and remaining_amount > 0
      order by installment_number asc
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

    v_payments_count := v_payments_count + 1;
  end loop;

  return query select v_credit_account_id, v_customer_id, v_payments_count;
END;
$$;

-- 3. Fix commercial metrics: monthly_replacement uses EXCLUSIVELY origin_month / origin_year
CREATE OR REPLACE FUNCTION get_credit_commercial_metrics()
RETURNS TABLE (
  current_monthly_collection numeric,
  monthly_replacement numeric,
  finished_cards integer,
  finished_installments_amount numeric,
  projected_next_month numeric
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
WITH month_bounds AS (
  SELECT
    DATE_TRUNC('month', NOW()) AS month_start,
    DATE_TRUNC('month', NOW()) + INTERVAL '1 month' AS month_end
),
payment_aggregates AS (
  SELECT
    cp.credit_account_id,
    COALESCE(SUM(cp.amount), 0)::numeric AS total_paid,
    MAX(cp.payment_date) AS last_payment_date
  FROM credit_payments cp
  GROUP BY cp.credit_account_id
),
installment_aggregates AS (
  SELECT
    ci.credit_account_id,
    COALESCE(SUM(ci.remaining_amount), 0)::numeric AS total_remaining
  FROM credit_installments ci
  GROUP BY ci.credit_account_id
),
account_aggregates AS (
  SELECT
    ca.id,
    ca.installment_amount,
    ca.origin_month,
    ca.origin_year,
    pa.total_paid,
    pa.last_payment_date,
    ia.total_remaining
  FROM credit_accounts ca
  LEFT JOIN payment_aggregates pa ON pa.credit_account_id = ca.id
  LEFT JOIN installment_aggregates ia ON ia.credit_account_id = ca.id
)
SELECT
  -- 1. Cobranza Actual
  COALESCE((
    SELECT SUM(cp.amount)::numeric
    FROM credit_payments cp
    CROSS JOIN month_bounds mb
    WHERE cp.payment_date >= mb.month_start
      AND cp.payment_date < mb.month_end
  ), 0)::numeric AS current_monthly_collection,

  -- 2. Reposición del Mes: exclusively origin_month / origin_year
  COALESCE(SUM(
    CASE WHEN aa.origin_month IS NOT NULL
          AND aa.origin_year IS NOT NULL
          AND aa.origin_month = EXTRACT(MONTH FROM mb.month_start)::integer
          AND aa.origin_year = EXTRACT(YEAR FROM mb.month_start)::integer
         THEN aa.installment_amount ELSE 0 END
  ), 0)::numeric AS monthly_replacement,

  -- 3. Tarjetas Terminadas del Mes
  COALESCE(SUM(
    CASE WHEN aa.total_remaining = 0
          AND aa.last_payment_date >= mb.month_start
          AND aa.last_payment_date < mb.month_end
         THEN 1 ELSE 0 END
  ), 0)::integer AS finished_cards,

  -- 4. Monto de Tarjetas Terminadas del Mes
  COALESCE(SUM(
    CASE WHEN aa.total_remaining = 0
          AND aa.last_payment_date >= mb.month_start
          AND aa.last_payment_date < mb.month_end
         THEN aa.installment_amount ELSE 0 END
  ), 0)::numeric AS finished_installments_amount,

  -- 5. Proyección Próxima Cobranza
  (
    SELECT COALESCE(SUM(ca.installment_amount), 0)
    FROM credit_accounts ca
    JOIN installment_aggregates ia
        ON ia.credit_account_id = ca.id
    WHERE ia.total_remaining > 0
  )::numeric AS projected_next_month
FROM account_aggregates aa, month_bounds mb;
$$;

-- 4. Fix monthly control: 'Nueva' status depends EXCLUSIVELY on origin_month / origin_year
CREATE OR REPLACE FUNCTION get_credit_monthly_control()
RETURNS TABLE (
  customer_name text,
  operation_number text,
  product_name text,
  installment_amount numeric,
  status text,
  sale_date date,
  last_payment_date date,
  remaining_amount numeric,
  origin_month integer,
  origin_year integer
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  WITH account_payments AS (
    SELECT
      cp.credit_account_id,
      COALESCE(SUM(cp.amount), 0)::numeric AS total_paid,
      MAX(cp.payment_date)::date AS last_payment_date
    FROM credit_payments cp
    GROUP BY cp.credit_account_id
  ),
  account_installments AS (
    SELECT
      ci.credit_account_id,
      COALESCE(SUM(ci.remaining_amount), 0)::numeric AS total_remaining
    FROM credit_installments ci
    GROUP BY ci.credit_account_id
  )
  SELECT
    c.full_name AS customer_name,
    ca.operation_number,
    ca.product_name,
    ca.installment_amount,
    CASE
      WHEN COALESCE(ai.total_remaining, 0) = 0 THEN 'Finalizada'
      WHEN ca.origin_month IS NOT NULL
           AND ca.origin_year IS NOT NULL
           AND ca.origin_month = EXTRACT(MONTH FROM NOW())::integer
           AND ca.origin_year = EXTRACT(YEAR FROM NOW())::integer THEN 'Nueva'
      ELSE 'En curso'
    END AS status,
    ca.sale_date::date,
    ap.last_payment_date,
    COALESCE(ai.total_remaining, 0) AS remaining_amount,
    ca.origin_month,
    ca.origin_year
  FROM credit_accounts ca
  LEFT JOIN customers c ON c.id = ca.customer_id
  LEFT JOIN account_payments ap ON ap.credit_account_id = ca.id
  LEFT JOIN account_installments ai ON ai.credit_account_id = ca.id
  WHERE ca.is_active = true
  ORDER BY ca.sale_date DESC;
$$;

-- 5. Transaccional payment registration: register_credit_payment()
-- Eliminates risk of orphaned payments (payment without allocations).
-- Replaces the two-step TypeScript flow: insert + apply_credit_payment RPC.
CREATE OR REPLACE FUNCTION register_credit_payment(
  p_credit_account_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_payment_method text DEFAULT 'EFECTIVO',
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id uuid;
  v_installment record;
  v_remaining_to_allocate numeric(12, 2);
  v_allocation_amount numeric(12, 2);
  v_account_remaining numeric(12, 2);
BEGIN
  -- 1. Validate positive amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'PAYMENT_INVALID_AMOUNT';
  END IF;

  -- 2. Validate payment does not exceed total debt
  SELECT COALESCE(SUM(remaining_amount), 0) INTO v_account_remaining
  FROM credit_installments
  WHERE credit_account_id = p_credit_account_id;

  IF p_amount > v_account_remaining THEN
    RAISE EXCEPTION 'PAYMENT_EXCEEDS_DEBT';
  END IF;

  -- 3. Insert payment
  INSERT INTO credit_payments (
    credit_account_id,
    amount,
    payment_date,
    payment_method,
    notes
  ) VALUES (
    p_credit_account_id,
    p_amount,
    p_payment_date,
    COALESCE(NULLIF(TRIM(p_payment_method), ''), 'EFECTIVO'),
    NULLIF(TRIM(p_notes), '')
  )
  RETURNING id INTO v_payment_id;

  -- 4. Apply payment FIFO to installments
  v_remaining_to_allocate := p_amount;

  FOR v_installment IN
    SELECT *
    FROM credit_installments
    WHERE credit_account_id = p_credit_account_id
      AND remaining_amount > 0
    ORDER BY installment_number ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining_to_allocate <= 0;

    v_allocation_amount := LEAST(v_remaining_to_allocate, v_installment.remaining_amount);

    INSERT INTO credit_payment_allocations (
      credit_payment_id,
      credit_installment_id,
      amount
    ) VALUES (
      v_payment_id,
      v_installment.id,
      v_allocation_amount
    );

    UPDATE credit_installments
    SET
      paid_amount = paid_amount + v_allocation_amount,
      remaining_amount = remaining_amount - v_allocation_amount,
      status = CASE
        WHEN remaining_amount - v_allocation_amount = 0 THEN 'PAID'
        ELSE 'PARTIAL'
      END,
      updated_at = NOW()
    WHERE id = v_installment.id;

    v_remaining_to_allocate := v_remaining_to_allocate - v_allocation_amount;
  END LOOP;

  -- 5. Validate full allocation
  IF v_remaining_to_allocate <> 0 THEN
    RAISE EXCEPTION 'PAYMENT_NOT_FULLY_ALLOCATED';
  END IF;

  -- 6. Return payment id
  RETURN v_payment_id;
END;
$$;

-- 6. Revoke public execution on updated RPCs
REVOKE EXECUTE ON FUNCTION import_credit_portfolio_row(jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_credit_commercial_metrics() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_credit_monthly_control() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION register_credit_payment(uuid, numeric, date, text, text) FROM anon, authenticated;
