-- Backfill script: Assign origin_month / origin_year to existing credit_accounts
-- Run this AFTER applying migration 202606080001_fix_credit_origin_period.sql.
--
-- WARNING: Many imported accounts have sale_date = import_date, so an automatic
-- backfill from sale_date would be wrong for them. Use the options below
-- according to the quality of your data.

-- ========================================================================
-- OPTION A: Fallback from sale_date (only if you are sure sale_date is correct)
-- ========================================================================
/*
UPDATE credit_accounts
SET
  origin_month = EXTRACT(MONTH FROM sale_date)::integer,
  origin_year = EXTRACT(YEAR FROM sale_date)::integer
WHERE origin_month IS NULL
  AND origin_year IS NULL;
*/

-- ========================================================================
-- OPTION B: Heuristic from earliest payment date per account
-- Use when sale_date is unreliable but the first payment month is a reasonable proxy.
-- ========================================================================
UPDATE credit_accounts ca
SET
  origin_month = EXTRACT(MONTH FROM ep.first_payment_date)::integer,
  origin_year = EXTRACT(YEAR FROM ep.first_payment_date)::integer
FROM (
  SELECT credit_account_id, MIN(payment_date) AS first_payment_date
  FROM credit_payments
  GROUP BY credit_account_id
) ep
WHERE ca.id = ep.credit_account_id
  AND ca.origin_month IS NULL
  AND ca.origin_year IS NULL;

-- ========================================================================
-- OPTION C: Manual bulk update from known historical data (recommended for imports)
--
-- 1. Create a temp table with the true origin period per operation_number:
-- ========================================================================
CREATE TEMP TABLE IF NOT EXISTS _tmp_historical_origin (
  operation_number text PRIMARY KEY,
  origin_month integer NOT NULL,
  origin_year integer NOT NULL
);

-- 2. Populate _tmp_historical_origin from your external source (CSV, JSON, etc.).
--    Uncomment and edit the INSERT below, or load via COPY / GUI.
/*
INSERT INTO _tmp_historical_origin (operation_number, origin_month, origin_year)
VALUES
  ('T-0001', 3, 2024),
  ('T-0002', 5, 2024)
ON CONFLICT (operation_number) DO NOTHING;
*/

-- 3. Apply the historical origin data to credit_accounts:
/*
UPDATE credit_accounts ca
SET
  origin_month = t.origin_month,
  origin_year = t.origin_year
FROM _tmp_historical_origin t
WHERE ca.operation_number = t.operation_number
  AND (ca.origin_month IS NULL OR ca.origin_year IS NULL);
*/

-- ========================================================================
-- OPTION D: One-off targeted updates by operation_number
-- ========================================================================
/*
UPDATE credit_accounts
SET origin_month = 1, origin_year = 2024
WHERE operation_number = 'T-XXXX';
*/

-- ========================================================================
-- VERIFICATION
-- ========================================================================
SELECT
  COUNT(*) FILTER (WHERE origin_month IS NULL) AS missing_origin_month,
  COUNT(*) FILTER (WHERE origin_year IS NULL) AS missing_origin_year,
  COUNT(*) AS total_accounts
FROM credit_accounts;
