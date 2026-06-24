# EJECUCIÓN FASE 4 — SEMANA 1

## SQL Listo para Ejecutar en Supabase SQL Editor

---

## TAREA 1 — Queries A-E de Auditoría

### Query A — Pagos individualmente huérfanos
```sql
SELECT
  cp.id AS payment_id,
  cp.credit_account_id,
  ca.operation_number,
  cp.amount AS payment_amount,
  COALESCE(SUM(cpa.amount), 0) AS allocated_amount,
  cp.amount - COALESCE(SUM(cpa.amount), 0) AS unallocated_amount,
  cp.payment_date,
  cp.created_at
FROM credit_payments cp
LEFT JOIN credit_accounts ca ON ca.id = cp.credit_account_id
LEFT JOIN credit_payment_allocations cpa
  ON cpa.credit_payment_id = cp.id
GROUP BY cp.id, cp.credit_account_id, ca.operation_number, cp.amount, cp.payment_date, cp.created_at
HAVING cp.amount <> COALESCE(SUM(cpa.amount), 0)
ORDER BY unallocated_amount DESC;
```

**Criterio de aceptación:** `COUNT(*) = 0` → Sin pagos huérfanos. ✅

---

### Query B — Divergencia cuenta-level (payments vs installments)
```sql
SELECT
  ca.id AS account_id,
  ca.operation_number,
  COALESCE(pay.total_payments, 0) AS total_payments,
  COALESCE(inst.total_paid_installments, 0) AS total_paid_installments,
  COALESCE(pay.total_payments, 0) - COALESCE(inst.total_paid_installments, 0) AS difference
FROM credit_accounts ca
LEFT JOIN (
  SELECT credit_account_id, SUM(amount) AS total_payments
  FROM credit_payments GROUP BY credit_account_id
) pay ON pay.credit_account_id = ca.id
LEFT JOIN (
  SELECT credit_account_id, SUM(paid_amount) AS total_paid_installments
  FROM credit_installments GROUP BY credit_account_id
) inst ON inst.credit_account_id = ca.id
WHERE COALESCE(pay.total_payments, 0) <> COALESCE(inst.total_paid_installments, 0)
ORDER BY ABS(difference) DESC;
```

**Criterio de aceptación:** `COUNT(*) = 0` → Cuadratura perfecta. ✅

---

### Query C — Cuentas donde total_collected > total_financed
```sql
SELECT
  ca.id AS account_id,
  ca.operation_number,
  (ca.installment_amount * ca.installment_count) AS total_financed,
  COALESCE(SUM(cp.amount), 0) AS total_collected,
  COALESCE(SUM(cp.amount), 0) - (ca.installment_amount * ca.installment_count) AS excess
FROM credit_accounts ca
LEFT JOIN credit_payments cp ON cp.credit_account_id = ca.id
GROUP BY ca.id, ca.operation_number, ca.installment_amount, ca.installment_count
HAVING COALESCE(SUM(cp.amount), 0) > (ca.installment_amount * ca.installment_count)
ORDER BY excess DESC;
```

**Criterio de aceptación:** `COUNT(*) = 0` → No hay sobrepagos contables. ✅

---

### Query D — Cuadratura global del dashboard
```sql
SELECT
  'total_financed' AS metric,
  COALESCE(SUM(ca.installment_amount * ca.installment_count), 0)::numeric AS value
FROM credit_accounts ca
WHERE ca.is_active = true

UNION ALL

SELECT
  'total_collected_via_payments',
  COALESCE(SUM(cp.amount), 0)::numeric
FROM credit_payments cp
JOIN credit_accounts ca ON ca.id = cp.credit_account_id
WHERE ca.is_active = true

UNION ALL

SELECT
  'total_collected_via_installments',
  COALESCE(SUM(ci.original_amount - ci.remaining_amount), 0)::numeric
FROM credit_installments ci
JOIN credit_accounts ca ON ca.id = ci.credit_account_id
WHERE ca.is_active = true

UNION ALL

SELECT
  'total_pending_via_installments',
  COALESCE(SUM(ci.remaining_amount), 0)::numeric
FROM credit_installments ci
JOIN credit_accounts ca ON ca.id = ci.credit_account_id
WHERE ca.is_active = true;
```

**Interpretación:**
- `total_collected_via_payments` debe ser igual a `total_collected_via_installments`.
- `total_pending_via_installments` debe ser igual a `total_financed - total_collected_via_installments`.
- Si `total_collected_via_payments > total_collected_via_installments`, hay pagos huérfanos.

---

### Query E — Error de redondeo entre contrato y cuotas
```sql
WITH agg AS (
  SELECT
    COALESCE(SUM(ci.original_amount - ci.remaining_amount), 0) AS collected_installments,
    COALESCE(SUM(ci.remaining_amount), 0) AS pending_installments,
    COALESCE(SUM(ca.installment_amount * ca.installment_count), 0) AS financed_contract
  FROM credit_accounts ca
  LEFT JOIN credit_installments ci ON ci.credit_account_id = ca.id
  WHERE ca.is_active = true
)
SELECT
  collected_installments,
  pending_installments,
  financed_contract,
  (collected_installments + pending_installments) - financed_contract AS rounding_error,
  CASE
    WHEN ABS((collected_installments + pending_installments) - financed_contract) < 0.01 THEN 'OK'
    ELSE 'REVIEW'
  END AS status
FROM agg;
```

**Criterio de aceptación:** `status = 'OK'` → Redondeo tolerable. ✅

---

## TAREA 2 — Verificación de UNIQUE(operation_number)

### Query de validación previa (obligatoria)
```sql
-- Paso 1: Detectar duplicados exactos
SELECT operation_number, COUNT(*) AS dup_count
FROM credit_accounts
WHERE operation_number IS NOT NULL
  AND operation_number <> ''
GROUP BY operation_number
HAVING COUNT(*) > 1
ORDER BY dup_count DESC;

-- Paso 2: Detectar valores con espacios al inicio/final
SELECT id, operation_number, '[' || operation_number || ']' AS quoted
FROM credit_accounts
WHERE operation_number IS NOT NULL
  AND (operation_number <> TRIM(operation_number));

-- Paso 3: Detectar valores vacíos (no NULL, pero string vacío)
SELECT id, operation_number
FROM credit_accounts
WHERE operation_number = '';

-- Paso 4: Resumen de nulos y vacíos
SELECT
  COUNT(*) FILTER (WHERE operation_number IS NULL) AS null_count,
  COUNT(*) FILTER (WHERE operation_number = '') AS empty_count,
  COUNT(*) FILTER (WHERE operation_number IS NOT NULL AND operation_number <> '') AS valid_count
FROM credit_accounts;
```

**Criterio de aceptación para aplicar UNIQUE:**
- Query 1 (`dup_count`) debe devolver **0 filas**.
- Query 2 (`espacios`) debe devolver **0 filas** (o limpiarse primero con `UPDATE ... SET operation_number = TRIM(operation_number)`).
- Query 3 (`vacíos`) debe devolver **0 filas** (o limpiarse primero con `UPDATE ... SET operation_number = NULL WHERE operation_number = ''`).

**Nota sobre NULL:** PostgreSQL permite múltiples `NULL` en una columna `UNIQUE`. No hay riesgo con `NULL`.

---

### Query de limpieza (si aplica)
```sql
-- Solo ejecutar si Query 2 o 3 devolvieron filas
UPDATE credit_accounts
SET operation_number = NULL
WHERE operation_number = '';

UPDATE credit_accounts
SET operation_number = TRIM(operation_number)
WHERE operation_number IS NOT NULL
  AND operation_number <> TRIM(operation_number);
```

---

### Query final de constraint
```sql
-- Solo ejecutar si la validación previa devolvió 0 filas
ALTER TABLE credit_accounts
ADD CONSTRAINT uq_credit_accounts_operation_number
UNIQUE (operation_number);
```

**Riesgos considerados:**
- `NULL`: PostgreSQL permite múltiples `NULL` en `UNIQUE`. No hay riesgo.
- Espacios: Si `operation_number = '123'` y `' 123'` existen, el `TRIM` debe ejecutarse primero.
- Mayúsculas/minúsculas: `UNIQUE` es case-sensitive en PostgreSQL. `'ABC'` y `'abc'` son distintos. Esto es deseado si los números de tarjeta pueden tener letras mixtas.

---

## TAREA 3 — Índices compuestos

### SQL final
```sql
-- Índice para consultas de cobranza y pagos que filtran por cuenta + status
CREATE INDEX IF NOT EXISTS idx_credit_installments_account_status
ON credit_installments(credit_account_id, status);

-- Índice para consultas de pagos por cuenta + fecha (dashboard, control mensual)
CREATE INDEX IF NOT EXISTS idx_credit_payments_account_date
ON credit_payments(credit_account_id, payment_date DESC);

-- Índice para notas de gestión por cuenta + fecha (listado de detalle)
CREATE INDEX IF NOT EXISTS idx_credit_collection_notes_account_created
ON credit_collection_notes(credit_account_id, created_at DESC);
```

**Notas:**
- `CREATE INDEX IF NOT EXISTS` es idempotente. No falla si el índice ya existe.
- No hay impacto en datos existentes.
- Puede tardar segundos si las tablas son grandes. Ejecutar en horario de baja actividad.

---

## TAREA 4 — Checklist de ejecución

### Paso 1 — Ejecutar Queries A-E
- [ ] Abrir Supabase SQL Editor (preferiblemente con Service Role o deshabilitando RLS temporalmente).
- [ ] Copiar y ejecutar **Query A** (pagos huérfanos).
- [ ] Copiar y ejecutar **Query B** (divergencia payments vs installments).
- [ ] Copiar y ejecutar **Query C** (sobrepagos contables).
- [ ] Copiar y ejecutar **Query D** (cuadratura global).
- [ ] Copiar y ejecutar **Query E** (redondeo).
- [ ] Capturar screenshot o exportar resultados de cada query.
- [ ] **Puerta de entrada:** Si **Query A, B, C** devuelven 0 filas y **Query E** devuelve `status = 'OK'` → continuar. Si cualquiera devuelve filas → **DETENER TODO**. Documentar y reportar antes de continuar.

### Paso 2 — Validación UNIQUE(operation_number)
- [ ] Ejecutar Query de validación previa (Query 1: duplicados, Query 2: espacios, Query 3: vacíos, Query 4: resumen).
- [ ] Si hay duplicados → **NO aplicar UNIQUE**. Documentar duplicados.
- [ ] Si hay espacios o vacíos → ejecutar queries de limpieza primero.
- [ ] Re-ejecutar validación hasta obtener 0 filas en todos los checks.
- [ ] Ejecutar `ALTER TABLE ... ADD CONSTRAINT uq_credit_accounts_operation_number UNIQUE (operation_number)`.
- [ ] Verificar que la constraint se creó correctamente:
  ```sql
  SELECT conname, conrelid::regclass
  FROM pg_constraint
  WHERE conname = 'uq_credit_accounts_operation_number';
  ```

### Paso 3 — Creación de índices
- [ ] Ejecutar los 3 `CREATE INDEX IF NOT EXISTS` de TAREA 3.
- [ ] Verificar que los índices existen:
  ```sql
  SELECT indexname, indexdef
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'idx_credit_installments_account_status',
      'idx_credit_payments_account_date',
      'idx_credit_collection_notes_account_created'
    );
  ```

### Paso 4 — Re-ejecutar auditoría Q1-Q19
- [ ] Ejecutar nuevamente `../database/audit_credit_schema.sql` (el script completo de auditoría estructural).
- [ ] Ejecutar nuevamente las queries de integridad Q1-Q19 (si existen como scripts separados).
- [ ] Confirmar que todos los objetos siguen en `OK` y que los nuevos índices aparecen.
- [ ] Confirmar que no hay `MISSING` inesperados.

### Paso 5 — Documentar resultados
- [ ] Crear archivo de evidencia con los resultados de:
  - Queries A-E (filas devueltas, valores, estado de aceptación).
  - Validación UNIQUE (filas de duplicados, si se aplicó o no, fecha de aplicación).
  - Índices creados (fecha, confirmación de existencia).
  - Re-auditoría Q1-Q19 (estado final post-cambios).
- [ ] Guardar el archivo en `docs/auditorias/` o `auditoria/semana-1/` del repositorio.
- [ ] Reportar a stakeholders: "Semana 1 completada. Cartera saneada. Blindajes estructurales aplicados. Sin regresiones."

---

## IMPORTANTE — Límites estrictos de Semana 1

**NO se ejecuta en esta semana:**
- ❌ Triggers.
- ❌ Funciones nuevas (no se modifica `import_credit_portfolio_row`, `register_credit_payment`, etc.).
- ❌ `calculateSummary` (no se toca TypeScript).
- ❌ `overpayment` (no se toca UI ni tipos).
- ❌ Cambios en lógica de importación (no se agrega `IMPORT_PAYMENT_EXCEEDS_DEBT` ni `IMPORT_PAYMENT_NOT_FULLY_ALLOCATED`).
- ❌ Cambios en `is_active` (no se automatiza, no se alinea en métricas comerciales).
- ❌ Cambios en el dashboard, reportes o cobranza.

**SÍ se ejecuta en esta semana:**
- ✅ Queries A-E de auditoría (solo lectura, validación).
- ✅ `UNIQUE(operation_number)` (si la validación previa lo permite).
- ✅ Índices compuestos (`CREATE INDEX IF NOT EXISTS`).
- ✅ Re-auditoría estructural Q1-Q19.
- ✅ Documentación de evidencia.

---

**Este documento contiene únicamente SQL listo para ejecutar y checklist de validación. No se modifica código fuente ni lógica de negocio.**
