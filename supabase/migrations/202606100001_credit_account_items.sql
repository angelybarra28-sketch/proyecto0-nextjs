-- =============================================================================
-- MIGRACIÓN: Tabla intermedia para productos de una cuenta de crédito
-- Fecha: 2026-06-10
-- =============================================================================

-- 1. Tabla de items (productos) asociados a una cuenta de crédito
CREATE TABLE IF NOT EXISTS credit_account_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_account_id UUID NOT NULL REFERENCES credit_accounts(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) CHECK (unit_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Índices para lookups rápidos
CREATE INDEX IF NOT EXISTS idx_credit_account_items_account_id 
ON credit_account_items(credit_account_id);

CREATE INDEX IF NOT EXISTS idx_credit_account_items_product_name 
ON credit_account_items(product_name);

-- 3. RLS
ALTER TABLE credit_account_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read credit account items"
  ON credit_account_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
      AND role IN ('ADMIN', 'STAFF')
      AND is_active = true
  ));

-- 4. Revoke public access
REVOKE ALL ON credit_account_items FROM anon, authenticated;

-- 5. Comentario documental
COMMENT ON TABLE credit_account_items IS 'Productos individuales asociados a una cuenta de crédito. Permite múltiples productos por cuenta. El campo product_name en credit_accounts se mantiene para backward compatibility (concatenación de items).';
