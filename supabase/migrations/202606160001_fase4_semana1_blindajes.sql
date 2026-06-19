-- =============================================================================
-- FASE 4 - SEMANA 1: Blindajes estructurales
-- Ejecutar en Supabase SQL Editor (Service Role o RLS bypass)
-- =============================================================================
-- Validación previa completada: ✅ 0 duplicados, ✅ 0 espacios, ✅ 0 vacíos
-- Queries A-E completadas:      ✅ Todo OK
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- TAREA 1: UNIQUE(operation_number)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE credit_accounts
ADD CONSTRAINT uq_credit_accounts_operation_number
UNIQUE (operation_number);

-- ─────────────────────────────────────────────────────────────────────────────
-- TAREA 2: Índices compuestos
-- ─────────────────────────────────────────────────────────────────────────────

-- Índice para consultas de cobranza y pagos que filtran por cuenta + status
CREATE INDEX IF NOT EXISTS idx_credit_installments_account_status
ON credit_installments(credit_account_id, status);

-- Índice para pagos por cuenta + fecha (dashboard, control mensual)
CREATE INDEX IF NOT EXISTS idx_credit_payments_account_date
ON credit_payments(credit_account_id, payment_date DESC);

-- Índice para notas de gestión por cuenta + fecha (listado de detalle)
CREATE INDEX IF NOT EXISTS idx_credit_collection_notes_account_created
ON credit_collection_notes(credit_account_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN POST-APLICACIÓN
-- ─────────────────────────────────────────────────────────────────────────────

-- Verificar que la constraint se creó
SELECT conname, conrelid::regclass AS table_name
FROM pg_constraint
WHERE conname = 'uq_credit_accounts_operation_number';

-- Verificar que los índices existen
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_credit_installments_account_status',
    'idx_credit_payments_account_date',
    'idx_credit_collection_notes_account_created'
  );