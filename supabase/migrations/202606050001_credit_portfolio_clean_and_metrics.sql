-- Migration: Portfolio cleanup and commercial metrics
-- Adds transactional cleanup RPC and commercial metrics for credit portfolio
--
-- IMPORTANTE: Esta migración debe ejecutarse manualmente en Supabase.
-- Ver la sección "Cómo aplicar" al final del archivo.
--
-- Seguridad: Se envuelve en BEGIN/COMMIT para atomicidad.
-- Se usa DROP IF EXISTS antes de cada CREATE para permitir
-- cambios de return type entre ejecuciones.

BEGIN;

-- ============================================================================
-- DROP functions (if exist with different signatures)
-- ============================================================================
DROP FUNCTION IF EXISTS get_credit_clean_summary();
DROP FUNCTION IF EXISTS clean_credit_portfolio();
DROP FUNCTION IF EXISTS get_credit_commercial_metrics();
DROP FUNCTION IF EXISTS get_credit_monthly_control();

-- ============================================================================
-- 1. Summary before cleanup: counts of portfolio tables
-- ============================================================================
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

-- ============================================================================
-- 2. Transactional cleanup of the entire portfolio (keeps users, profiles, products, etc.)
-- ============================================================================
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
BEGIN
  DELETE FROM credit_payment_allocations WHERE true;
  GET DIAGNOSTICS v_allocations = ROW_COUNT;

  DELETE FROM credit_payments WHERE true;
  GET DIAGNOSTICS v_payments = ROW_COUNT;

  DELETE FROM credit_installments WHERE true;
  GET DIAGNOSTICS v_installments = ROW_COUNT;

  DELETE FROM credit_accounts WHERE true;
  GET DIAGNOSTICS v_accounts = ROW_COUNT;

  RETURN QUERY SELECT v_allocations, v_payments, v_installments, v_accounts, 0::bigint;
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- ============================================================================
-- 3. Commercial metrics for the dashboard
--
-- Business definitions:
--   current_monthly_collection = SUM(credit_payments.amount) where payment_date is in the current month
--   monthly_replacement        = SUM(credit_accounts.installment_amount) where sale_date is in the current month
--   finished_cards             = COUNT(*) of accounts with total_paid >= total_financed and last payment in current month
--   finished_installments_amount = SUM(installment_amount) of those finished accounts
--   projected_next_month       = current_monthly_collection + monthly_replacement - finished_installments_amount
-- ============================================================================
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
account_aggregates AS (
  SELECT
    ca.id,
    ca.installment_amount,
    ca.sale_date,
    (ca.installment_amount * ca.installment_count)::numeric AS total_financed,
    COALESCE(SUM(cp.amount), 0)::numeric AS total_paid,
    MAX(cp.payment_date) AS last_payment_date
  FROM credit_accounts ca
  LEFT JOIN credit_payments cp ON cp.credit_account_id = ca.id
  GROUP BY ca.id, ca.installment_amount, ca.installment_count, ca.sale_date
)
SELECT
  COALESCE((
    SELECT SUM(cp.amount)::numeric
    FROM credit_payments cp
    CROSS JOIN month_bounds mb
    WHERE cp.payment_date >= mb.month_start
      AND cp.payment_date < mb.month_end
  ), 0)::numeric AS current_monthly_collection,

  COALESCE(SUM(
    CASE WHEN aa.sale_date >= mb.month_start AND aa.sale_date < mb.month_end
         THEN aa.installment_amount ELSE 0 END
  ), 0)::numeric AS monthly_replacement,

  COALESCE(SUM(
    CASE WHEN aa.total_paid >= aa.total_financed
          AND aa.last_payment_date >= mb.month_start
          AND aa.last_payment_date < mb.month_end
         THEN 1 ELSE 0 END
  ), 0)::integer AS finished_cards,

  COALESCE(SUM(
    CASE WHEN aa.total_paid >= aa.total_financed
          AND aa.last_payment_date >= mb.month_start
          AND aa.last_payment_date < mb.month_end
         THEN aa.installment_amount ELSE 0 END
  ), 0)::numeric AS finished_installments_amount,

  (
    COALESCE((
      SELECT SUM(cp.amount)::numeric
      FROM credit_payments cp
      CROSS JOIN month_bounds mb
      WHERE cp.payment_date >= mb.month_start
        AND cp.payment_date < mb.month_end
    ), 0)
    + COALESCE(SUM(
        CASE WHEN aa.sale_date >= mb.month_start AND aa.sale_date < mb.month_end
             THEN aa.installment_amount ELSE 0 END
      ), 0)
    - COALESCE(SUM(
        CASE WHEN aa.total_paid >= aa.total_financed
              AND aa.last_payment_date >= mb.month_start
              AND aa.last_payment_date < mb.month_end
             THEN aa.installment_amount ELSE 0 END
      ), 0)
  )::numeric AS projected_next_month
FROM account_aggregates aa, month_bounds mb;
$$;

-- ============================================================================
-- 4. Monthly control report rows
-- ============================================================================
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

-- ============================================================================
-- Permissions
-- ============================================================================

-- Revoke public execution (only service_role should call these)
REVOKE EXECUTE ON FUNCTION get_credit_clean_summary() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION clean_credit_portfolio() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_credit_commercial_metrics() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_credit_monthly_control() FROM anon, authenticated;

-- Grant execution to service_role (used by admin API routes)
GRANT EXECUTE ON FUNCTION get_credit_clean_summary() TO service_role;
GRANT EXECUTE ON FUNCTION clean_credit_portfolio() TO service_role;
GRANT EXECUTE ON FUNCTION get_credit_commercial_metrics() TO service_role;
GRANT EXECUTE ON FUNCTION get_credit_monthly_control() TO service_role;

COMMIT;

-- ============================================================================
-- CÓMO APLICAR ESTA MIGRACIÓN EN SUPABASE
-- ============================================================================
-- Opción A: Consola SQL de Supabase (recomendada)
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
--
-- Opción C: psql directo
--   psql "postgresql://..." -f supabase/migrations/202606050001_credit_portfolio_clean_and_metrics.sql
-- ============================================================================
