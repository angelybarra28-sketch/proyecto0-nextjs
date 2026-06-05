-- Migration: Portfolio cleanup and commercial metrics
-- Adds transactional cleanup RPC and commercial metrics for credit portfolio
--
-- IMPORTANTE: Esta migración debe ejecutarse manualmente en Supabase.
-- Ver la sección "Cómo aplicar" al final del archivo.

-- 1. Summary before cleanup: counts of portfolio tables
CREATE OR REPLACE FUNCTION get_credit_clean_summary()
RETURNS TABLE (
  allocation_count bigint,
  payment_count bigint,
  installment_count bigint,
  account_count bigint,
  customer_count bigint
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM credit_payment_allocations),
    (SELECT COUNT(*) FROM credit_payments),
    (SELECT COUNT(*) FROM credit_installments),
    (SELECT COUNT(*) FROM credit_accounts),
    (SELECT COUNT(*) FROM customers);
$$;

-- 2. Transactional cleanup of the entire portfolio (keeps users, profiles, products, etc.)
CREATE OR REPLACE FUNCTION clean_credit_portfolio()
RETURNS TABLE (
  allocations_deleted bigint,
  payments_deleted bigint,
  installments_deleted bigint,
  accounts_deleted bigint,
  customers_deleted bigint
)
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allocations bigint;
  v_payments bigint;
  v_installments bigint;
  v_accounts bigint;
  v_customers bigint;
BEGIN
  DELETE FROM credit_payment_allocations;
  GET DIAGNOSTICS v_allocations = ROW_COUNT;

  DELETE FROM credit_payments;
  GET DIAGNOSTICS v_payments = ROW_COUNT;

  DELETE FROM credit_installments;
  GET DIAGNOSTICS v_installments = ROW_COUNT;

  DELETE FROM credit_accounts;
  GET DIAGNOSTICS v_accounts = ROW_COUNT;

  DELETE FROM customers;
  GET DIAGNOSTICS v_customers = ROW_COUNT;

  RETURN QUERY SELECT v_allocations, v_payments, v_installments, v_accounts, v_customers;
EXCEPTION WHEN OTHERS THEN
  -- Automatic rollback on exception
  RAISE;
END;
$$;

-- 3. Commercial metrics for the dashboard
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
WITH active_accounts AS (
  SELECT ca.id, ca.installment_amount
  FROM credit_accounts ca
  WHERE ca.is_active = true
    AND (ca.installment_amount * ca.installment_count) > COALESCE((
      SELECT SUM(cp.amount) FROM credit_payments cp WHERE cp.credit_account_id = ca.id
    ), 0)
),
replacement AS (
  SELECT COALESCE(SUM(ca.installment_amount), 0)::numeric AS amount
  FROM credit_accounts ca
  WHERE ca.sale_date >= DATE_TRUNC('month', NOW())
),
finished AS (
  SELECT
    ca.id,
    ca.installment_amount,
    (SELECT MAX(cp.payment_date) FROM credit_payments cp WHERE cp.credit_account_id = ca.id) AS last_payment_date
  FROM credit_accounts ca
  WHERE ca.is_active = true
    AND (ca.installment_amount * ca.installment_count) <= COALESCE((
      SELECT SUM(cp.amount) FROM credit_payments cp WHERE cp.credit_account_id = ca.id
    ), 0)
),
finished_this_month AS (
  SELECT COUNT(*)::integer AS cnt, COALESCE(SUM(installment_amount), 0)::numeric AS amount
  FROM finished
  WHERE last_payment_date >= DATE_TRUNC('month', NOW())
)
SELECT
  COALESCE((SELECT SUM(installment_amount) FROM active_accounts), 0)::numeric AS current_monthly_collection,
  COALESCE((SELECT amount FROM replacement), 0)::numeric AS monthly_replacement,
  COALESCE((SELECT cnt FROM finished_this_month), 0)::integer AS finished_cards,
  COALESCE((SELECT amount FROM finished_this_month), 0)::numeric AS finished_installments_amount,
  (
    COALESCE((SELECT SUM(installment_amount) FROM active_accounts), 0)
    + COALESCE((SELECT amount FROM replacement), 0)
    - COALESCE((SELECT amount FROM finished_this_month), 0)
  )::numeric AS projected_next_month;
$$;

-- 4. Monthly control report rows
CREATE OR REPLACE FUNCTION get_credit_monthly_control()
RETURNS TABLE (
  customer_name text,
  operation_number text,
  product_name text,
  installment_amount numeric,
  status text,
  sale_date date,
  last_payment_date date,
  remaining_amount numeric
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.full_name AS customer_name,
    ca.operation_number,
    ca.product_name,
    ca.installment_amount,
    CASE
      WHEN (ca.installment_amount * ca.installment_count) <= COALESCE(SUM(cp.amount), 0) THEN 'Finalizada'
      WHEN ca.sale_date >= DATE_TRUNC('month', NOW()) THEN 'Nueva'
      ELSE 'En curso'
    END AS status,
    ca.sale_date::date,
    MAX(cp.payment_date)::date AS last_payment_date,
    (ca.installment_amount * ca.installment_count - COALESCE(SUM(cp.amount), 0))::numeric AS remaining_amount
  FROM credit_accounts ca
  LEFT JOIN customers c ON c.id = ca.customer_id
  LEFT JOIN credit_payments cp ON cp.credit_account_id = ca.id
  WHERE ca.is_active = true
  GROUP BY ca.id, c.full_name, ca.operation_number, ca.product_name, ca.installment_amount, ca.installment_count, ca.sale_date
  ORDER BY ca.sale_date DESC;
$$;

-- Revoke public execution
REVOKE EXECUTE ON FUNCTION get_credit_clean_summary() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION clean_credit_portfolio() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_credit_commercial_metrics() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_credit_monthly_control() FROM anon, authenticated;

-- ============================================================================
-- CÓMO APLICAR ESTA MIGRACIÓN EN SUPABASE
-- ============================================================================
-- Opción A: Consola SQL de Supabase (recomendada para una sola ejecución)
-- 1. Ir a https://supabase.com/dashboard
-- 2. Seleccionar el proyecto
-- 3. Ir a SQL Editor (izquierda) → New query
-- 4. Copiar TODO el contenido de este archivo
-- 5. Click en Run
-- 6. Verificar con:
--    SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';
--    Deben aparecer: get_credit_clean_summary, clean_credit_portfolio,
--    get_credit_commercial_metrics, get_credit_monthly_control
--
-- Opción B: CLI de Supabase (si se tiene configurado localmente)
--   npx supabase db push
--   o
--   npx supabase migration up
--
-- Opción C: psql directo (si se tiene acceso a la base de datos)
--   psql "postgresql://..." -f supabase/migrations/202606050001_credit_portfolio_clean_and_metrics.sql
--
-- NOTA: Si la ejecución falla, el mensaje de error aparecerá en la consola.
-- Revise que las tablas credit_payment_allocations, credit_payments,
-- credit_installments, credit_accounts y customers existan antes de ejecutar.
-- ============================================================================
