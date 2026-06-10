# FASE 4 — PLAN DE ACCIÓN CONSERVADOR (Hardening del Módulo de Cartera)

## Contexto de partida

- Todas las queries de integridad Q1-Q19 devolvieron **0 filas**.
- No se detectaron cuotas corruptas, balances rotos, pagos huérfanos ni duplicados.
- **La cartera está sana en este momento.**
- No se modificó código ni base de datos durante ninguna auditoría.
- El objetivo es **endurecer el módulo sin introducir regresiones** ni cambios funcionales prematuros.

---

## Prioridad 1 — Blindajes de Base de Datos

### 1.1 Estado actual de índices y constraints

| Objeto solicitado | ¿Existe? | Estado actual en migraciones |
|-------------------|----------|------------------------------|
| `UNIQUE(operation_number)` | **NO** | `operation_number text` sin constraint. Índice simple `idx_credit_accounts_operation_number` existe. |
| `idx_credit_collection_notes_account_created` | **NO** | Existen `idx_credit_collection_notes_account_id` (account_id) y `idx_credit_collection_notes_created_at` (created_at desc) por separado. |
| `idx_credit_installments_account_status` | **NO** | Existen `idx_credit_installments_account_id`, `idx_credit_installments_status`, `idx_credit_installments_status_due_date` por separado. |
| `idx_credit_payments_account_date` | **NO** | Existen `idx_credit_payments_credit_account_id` y `idx_credit_payments_payment_date` por separado. |

### 1.2 Análisis por ítem

#### A) `UNIQUE(operation_number)`
- **Riesgo de implementación:** **MEDIO.**
- **Problema:** Actualmente `operation_number` permite `NULL` y duplicados. El `importPortfolioBatch` en TypeScript hace una pre-validación de duplicados (`existingNumbers`), pero la base de datos no la refuerza. Si alguien inserta directamente vía SQL (o si el batch se ejecuta en paralelo), puede haber duplicados.
- **Dependencia:** Ninguna funcionalidad actual usa `operation_number` como clave de búsqueda primaria (usa `id` UUID). El listado permite buscar por `operation_number`, pero no requiere unicidad para funcionar.
- **Dato:** El `previewPortfolioFile` detecta duplicados *dentro del archivo* y emite warnings, pero no bloquea la importación. Si se agrega `UNIQUE`, la importación de un archivo con duplicados internos (ya existentes en DB) fallaría con un error de PostgreSQL, lo cual es **deseado**.
- **Orden:** Puede aplicarse en cualquier momento. No hay dependencias.
- **SQL recomendado:**
  ```sql
  -- Paso 1: Verificar si hay duplicados existentes antes de aplicar
  SELECT operation_number, COUNT(*) 
  FROM credit_accounts 
  WHERE operation_number IS NOT NULL 
  GROUP BY operation_number 
  HAVING COUNT(*) > 1;
  
  -- Paso 2: Si la query anterior devuelve 0 filas, aplicar
  ALTER TABLE credit_accounts 
  ADD CONSTRAINT uq_credit_accounts_operation_number UNIQUE (operation_number);
  ```

#### B) `idx_credit_collection_notes_account_created`
- **Riesgo:** **BAJO.**
- **Beneficio:** La función `get_credit_collection_route` no usa `credit_collection_notes`. La página de detalle de cuenta (`CreditAccountDetailView`) muestra notas ordenadas por `created_at desc`. El índice compuesto `(credit_account_id, created_at desc)` optimizaría esa consulta, aunque actualmente el filtrado por `credit_account_id` ya es rápido por `idx_credit_collection_notes_account_id` (la cardinalidad de notas por cuenta es baja).
- **Recomendación:** Opcional. Bajo impacto en performance actual.
- **SQL:**
  ```sql
  CREATE INDEX IF NOT EXISTS idx_credit_collection_notes_account_created 
  ON credit_collection_notes(credit_account_id, created_at DESC);
  ```

#### C) `idx_credit_installments_account_status`
- **Riesgo:** **BAJO.**
- **Beneficio:** Alto. `get_credit_collection_route` filtra por `credit_account_id` y luego por `status = 'OVERDUE'`. `register_credit_payment` itera `WHERE credit_account_id = ... AND remaining_amount > 0`. El índice compuesto `(credit_account_id, status)` o `(credit_account_id, remaining_amount)` aceleraría estas consultas.
- **SQL:**
  ```sql
  CREATE INDEX IF NOT EXISTS idx_credit_installments_account_status 
  ON credit_installments(credit_account_id, status);
  ```
  O más preciso para el caso de pagos:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_credit_installments_account_remaining 
  ON credit_installments(credit_account_id, remaining_amount) 
  WHERE remaining_amount > 0;
  ```

#### D) `idx_credit_payments_account_date`
- **Riesgo:** **BAJO.**
- **Beneficio:** Medio. El dashboard v2 usa `credit_payments` filtrado por `payment_date` en el gráfico mensual (`monthly_collection`), no por `credit_account_id`. El control mensual usa `MAX(cp.payment_date)` agrupado por cuenta. Un índice `(credit_account_id, payment_date)` optimizaría `MAX(payment_date)` por cuenta.
- **SQL:**
  ```sql
  CREATE INDEX IF NOT EXISTS idx_credit_payments_account_date 
  ON credit_payments(credit_account_id, payment_date DESC);
  ```

### 1.3 Orden de despliegue recomendado para Prioridad 1

1. **Verificar duplicados** de `operation_number` con la query de validación.
2. Si 0 filas: aplicar `UNIQUE(operation_number)`.
3. Aplicar índices compuestos opcionales en paralelo (son `IF NOT EXISTS`, no rompen nada).

---

## Prioridad 2 — Auditoría real de pagos huérfanos

### 2.1 Premisa
Aunque las auditorías Q1-Q19 no detectaron inconsistencias, la **lógica de `import_credit_portfolio_row` permite teóricamente** generar pagos huérfanos. Debemos confirmar con queries reales si la teoría se materializó en datos.

### 2.2 Queries de validación exactos

#### Query A — Pagos individualmente huérfanos
```sql
SELECT
  cp.id AS payment_id,
  cp.credit_account_id,
  cp.amount AS payment_amount,
  COALESCE(SUM(cpa.amount), 0) AS allocated_amount,
  cp.amount - COALESCE(SUM(cpa.amount), 0) AS unallocated_amount,
  cp.payment_date,
  cp.created_at
FROM credit_payments cp
LEFT JOIN credit_payment_allocations cpa
  ON cpa.credit_payment_id = cp.id
GROUP BY cp.id, cp.credit_account_id, cp.amount, cp.payment_date, cp.created_at
HAVING cp.amount <> COALESCE(SUM(cpa.amount), 0)
ORDER BY unallocated_amount DESC;
```

**Criterio de aprobación:** `COUNT(*) = 0` → Sin pagos huérfanos. ✅  
**Criterio de rechazo:** `COUNT(*) > 0` → Existen pagos huérfanos. Requiere análisis caso por caso.

#### Query B — Divergencia cuenta-level
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

**Criterio:** `COUNT(*) = 0` → Cuadratura perfecta. ✅

#### Query C — Sobrepagos contables
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

**Criterio:** `COUNT(*) = 0` → No hay sobrepagos contables. ✅

#### Query D — Cuadratura global del dashboard
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

#### Query E — Redondeo entre contrato y cuotas
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
  (collected_installments + pending_installments) - financed_contract AS rounding_error
FROM agg;
```

**Criterio:** `rounding_error` debe ser `0` (o `|rounding_error| < 0.01` por centavos). ✅

### 2.3 Protocolo de ejecución
1. Ejecutar las 5 queries en **Supabase SQL Editor** (service role o con RLS bypass).
2. Capturar resultados en un archivo de evidencia.
3. Si todas devuelven 0 o cuadran: **el riesgo es puramente teórico** y el blindaje de importación (Prioridad 3) pasa a ser preventivo, no correctivo.
4. Si alguna devuelve filas: **el riesgo es real** y debe documentarse cada caso antes de aplicar cualquier blindaje (para no romper importaciones que "funcionan" con datos legacy).

---

## Prioridad 3 — Blindaje de importación

### 3.1 Análisis de `IMPORT_PAYMENT_EXCEEDS_DEBT`

**¿Qué haría?** Antes de insertar un pago histórico en `import_credit_portfolio_row`, validar que `payment_amount <= SUM(remaining_amount)` de las cuotas de esa cuenta.

**¿Es correcto implementarlo?**
- **Sí, si la evidencia lo justifica.** Si Query A/B/C encuentran 0 filas, la implementación es **preventiva** (no correctiva). No romperá importaciones actuales.
- **No, si hay datos legacy con "sobrepagos legítimos".** Si Query C encuentra filas, significa que ya existen sobrepagos importados. Si el negocio considera esos sobrepagos válidos (ej: un cliente pagó de más intencionalmente), la validación impediría re-importar esos casos.

**¿Puede romper importaciones históricas?**
- **Sí, si el Excel tiene `PAGO_ACUMULADO > TOTAL`.** La importación actual permite esto. Si se agrega la validación, esos archivos dejarían de importarse.
- La importación actual muestra un **warning** (`RESTANTE difiere de total - acumulado`), pero **no bloquea**. El blindaje convertiría el warning en un error fatal.
- **Recomendación:** Antes de implementar, analizar un mes de archivos de importación históricos para estimar cuántos tienen `PAGO_ACUMULADO > TOTAL`. Si es >0%, la implementación requiere cambio de negocio (no solo técnico).

### 3.2 Análisis de `IMPORT_PAYMENT_NOT_FULLY_ALLOCATED`

**¿Qué haría?** Al final del loop de asignación de cada pago importado, validar que `v_remaining_to_allocate = 0`.

**¿Es correcto?**
- **Sí, siempre.** Si un pago no se asigna completamente, es un bug de datos. No hay escenario de negocio donde un pago "deba" quedar sin asignación.
- **Riesgo de regresión:** Si Query A/B encuentran 0 filas, la validación es puramente preventiva. No romperá importaciones actuales.
- **Riesgo teórico:** Si un pago tiene monto `0` (aunque el `check (amount > 0)` en `credit_payments` debería evitarlo). No hay riesgo real.

### 3.3 Veredicto de Prioridad 3

- **Si Query A/B/C = 0:** Implementar `IMPORT_PAYMENT_NOT_FULLY_ALLOCATED` es **seguro y recomendado**. Implementar `IMPORT_PAYMENT_EXCEEDS_DEBT` es **seguro pero requiere confirmación de negocio** (¿bloqueamos importaciones con pagos mayores a la deuda?).
- **Si Query A/B/C > 0:** No implementar ninguno hasta que se resuelvan los casos legacy. Documentar cada caso.

---

## Prioridad 4 — `calculateSummary` y `overpayment`

### 4.1 Análisis del impacto real

**Función:** `Math.max(0, total - paid)` en `lib/services/creditAccountService.ts`.

**¿Existe evidencia de sobrepagos reales?**
- La evidencia de las auditorías Q1-Q19 dice: **No hay pagos huérfanos, no hay balances rotos.**
- Sin embargo, la función `calculateSummary` usa `total = installment_amount * installment_count`, mientras que `generate_credit_installments` genera cuotas con `trunc()` (redondeo). Esto crea una **discrepancia de redondeo potencial** que `Math.max(0, ...)` ocultaría.
- **Query E** (redondeo) debe ejecutarse para confirmar si esta discrepancia existe en la práctica.

**Impacto en UI:**
- Si `remaining` se muestra como `$0` por redondeo, la tabla muestra "Pagado" y el detalle oculta el formulario de pago. **Esto es funcionalmente correcto** si la deuda real es 0 (aunque el cálculo sea por redondeo). El problema es que no se puede distinguir "pagado correctamente" de "redondeo oculto".
- Si hay un sobrepago real (cliente pagó de más), la UI muestra "Finalizada" y oculta el formulario. **Esto es incorrecto** si el negocio necesita gestionar devoluciones.

**Impacto en reportes:**
- `get_credit_dashboard` (v2) ya usa `credit_installments` para el resumen, no `calculateSummary`. El redondeo de `calculateSummary` no afecta el dashboard SQL.
- Las exportaciones a Excel (`creditExport.ts`) usan `remaining` de `calculateSummary`. Si hay redondeo, el Excel mostraría `$0` cuando el SQL real podría tener `$0.01`.

### 4.2 Veredicto de Prioridad 4

- **No existe evidencia de sobrepagos reales** (según auditorías Q1-Q19).
- **El riesgo es redondeo, no corrupción.**
- **Implementar `overpayment` ahora es preventivo, no correctivo.** No es urgente si la cartera está sana.
- **Recomendación:** Postergar hasta que Query E confirme la existencia de errores de redondeo. Si Query E muestra `rounding_error = 0`, el impacto es puramente teórico.
- **Quick Win alternativo:** Cambiar `calculateSummary` para usar `SUM(installments.original_amount)` en vez de `installment_amount * installment_count` para calcular `total`. Esto elimina la discrepancia de redondeo sin necesidad de agregar `overpayment`. Es un cambio de 1 línea, sin impacto en el schema.

---

## Prioridad 5 — `is_active`

### 5.1 Análisis semántico

**¿Qué representa `is_active`?**
- **Visibilidad operativa, no estado financiero.** Es un flag de "esta cuenta está viva en el sistema".
- El estado financiero (pagado/pendiente) se deriva de `credit_installments.remaining_amount`.

**¿Qué procesos dependen de `is_active`?**
| Proceso | Fuente | ¿Filtra `is_active`? |
|---------|--------|---------------------|
| Listado de cuentas | `getCreditAccounts` | Sí (`.eq('is_active', true)`) |
| Dashboard v1/v2 | `get_credit_dashboard` | Sí (`WHERE ca.is_active = true`) |
| Ruta de cobranza | `get_credit_collection_route` | Sí |
| Control mensual | `get_credit_monthly_control` | Sí |
| Métricas comerciales | `get_credit_commercial_metrics` | **NO** |
| Detalle individual | `getCreditAccountById` | **NO** |
| Pago de cuotas | `register_credit_payment` | **NO** |
| Importación | `import_credit_portfolio_row` | **NO** (inserta `default true`) |

**¿Qué se rompería si se vuelve automático?**
- **Dashboard:** Si una cuenta terminada en enero se desactiva en febrero, el dashboard histórico (regenerado) la excluiría. Los totales dejan de ser reproducibles.
- **Importación:** Cuentas importadas y pagadas desaparecerían inmediatamente del listado. UX roto (usuario piensa que la importación falló).
- **Reportes:** Inconsistencia entre `control-mensual` (filtra `is_active`) y métricas comerciales (no filtra). Si se automatiza `is_active`, ambos deberían alinearse.
- **Detalle:** Se puede consultar una cuenta inactiva por ID, pero no aparece en el listado. Esto es confuso si el usuario tiene un link directo.

**¿Debe mantenerse manual?**
- **Sí, hasta que se resuelva la inconsistencia de filtrado entre métricas comerciales y el resto del sistema.**
- **Sí, hasta que se defina si `is_active` es un flag de negocio manual o un estado derivado.** No puede ser ambos.
- **Sí, si el negocio usa `is_active` para ocultar cuentas canceladas, anuladas o en litigio** (no solo "pagadas"). Si el trigger se vuelve automático, perdería ese caso de uso.

### 5.2 Veredicto de Prioridad 5

- **No automatizar `is_active` en este momento.**
- **Prerrequisito:** Unificar el filtrado de `is_active` en `get_credit_commercial_metrics` (ya sea agregarlo o documentar explícitamente por qué no está).
- **Prerrequisito:** Definir con el negocio si `is_active` puede usarse para casos no financieros (ej: "cuenta en litigio").

---

## Entregables

### A. Matriz de prioridades

| Prioridad | Tarea | Riesgo | Beneficio | Recomendación |
|-----------|-------|--------|-----------|---------------|
| **1** | UNIQUE(operation_number) | Medio (si hay duplicados) | Previene duplicados en DB | ✅ **Ejecutar primero**, pero solo tras validar duplicados con query. |
| **1** | Índices compuestos (account+status, account+date, account+created) | Bajo | Mejora performance en lecturas | ✅ **Ejecutar en paralelo**. Son `IF NOT EXISTS`, no rompen nada. |
| **2** | Ejecutar queries A-E de auditoría | Ninguno | Determina si riesgos son reales o teóricos | ✅ **Ejecutar antes de cualquier blindaje funcional.** Es la puerta de entrada. |
| **3** | `IMPORT_PAYMENT_NOT_FULLY_ALLOCATED` | Bajo (si Query A=0) | Previene pagos huérfanos | ✅ **Ejecutar si Query A=0.** Es puramente preventivo. |
| **3** | `IMPORT_PAYMENT_EXCEEDS_DEBT` | Medio (si hay Excel con excedentes) | Previene sobrepagos de importación | ⚠️ **Condicional:** Requiere confirmar con negocio si los Excel pueden tener pagos > deuda. Si Query C=0, es seguro. |
| **4** | `calculateSummary`: usar `SUM(original_amount)` | Bajo | Elimina discrepancia de redondeo | ✅ **Quick Win.** 1 línea, sin impacto en schema. |
| **4** | `overpayment` en UI y types | Medio | Transparencia de sobrepagos | ⏸️ **Postergar.** No hay evidencia de sobrepagos reales. |
| **5** | `is_active` automático | Alto | Menos cuentas en listado | ❌ **No ejecutar.** Rompe dashboard, reportes e importación. |
| **5** | Alinear `is_active` en métricas comerciales | Bajo | Consistencia de filtrado | ⚠️ **Ejecutar como fix de inconsistencia.** Documentar si filtra o no. |

### B. Plan de ejecución

#### Semana 1 — Evidencia y blindajes seguros

| Día | Actividad | Responsable | Entregable |
|-----|-----------|-------------|------------|
| 1-2 | Ejecutar queries A-E en producción (copia de seguridad) | DBA / DevOps | Captura de resultados (evidencia Q1-Q19 + A-E) |
| 2 | Validar duplicados de `operation_number` (query UNIQUE) | DBA | Confirmación de 0 filas |
| 3 | Aplicar `UNIQUE(operation_number)` si validación OK | DBA | Migration aplicada |
| 3 | Aplicar índices compuestos opcionales | DBA | `CREATE INDEX` ejecutados |
| 4-5 | Revisar resultados de queries A-E. Decidir si Prioridad 3 procede. | Tech Lead / Product Owner | Documento de decisión (go/no-go para blindaje de importación) |

#### Semana 2 — Blindajes condicionales

| Día | Actividad | Condición |
|-----|-----------|-----------|
| 1-2 | Implementar `IMPORT_PAYMENT_NOT_FULLY_ALLOCATED` en SQL | Si Query A = 0 |
| 3 | Revisar archivos de importación históricos (último mes) | Siempre |
| 4 | Decidir sobre `IMPORT_PAYMENT_EXCEEDS_DEBT` | Si Query C = 0 y negocio aprueba |
| 5 | Aplicar fix de `calculateSummary` (SUM original_amount) | Si Query E muestra redondeo > 0 |

#### Semana 3 — Consistencia y documentación

| Día | Actividad |
|-----|-----------|
| 1-2 | Alinear `is_active` en `get_credit_commercial_metrics` (agregar filtro o documentar por qué no está) |
| 3 | Documentar semántica de `is_active` en `AGENTS.md` o README de cartera |
| 4 | Re-ejecutar auditoría completa (Q1-Q19 + A-E) para confirmar que los blindajes no introdujeron regresiones |
| 5 | Cierre de fase. Reporte de integridad final. |

### C. Quick Wins (seguros, aplicables inmediatamente)

1. **Índices compuestos:** `idx_credit_installments_account_status`, `idx_credit_payments_account_date`, `idx_credit_collection_notes_account_created`. Son `CREATE INDEX IF NOT EXISTS`, no rompen nada, mejora performance.
2. **`UNIQUE(operation_number)`** (tras validar 0 duplicados). Protege contra duplicados futuros.
3. **Fix de redondeo en `calculateSummary`:** Cambiar `total` de `installment_amount * installment_count` a `SUM(installments.original_amount)`. Es una línea en TypeScript, sin impacto en DB.
4. **Documentar semántica de `is_active`:** Agregar un comentario en el código SQL (`COMMENT ON COLUMN credit_accounts.is_active IS '...'`) y en `AGENTS.md` para evitar confusiones futuras.

### D. Cambios que deben postergarse

1. **`is_active` automático:** Requiere alinear primero métricas comerciales, dashboard, reportes e importación. Riesgo de regresión alto.
2. **`overpayment` en UI:** Requiere evidencia de sobrepagos reales. Si Query C = 0, es un cambio funcional sin beneficio inmediato. Además, agregar un campo nuevo a `CreditAccountSummary` requiere actualizar la tabla, exportación, detalle y posiblemente el backend. No es trivial.
3. **`IMPORT_PAYMENT_EXCEEDS_DEBT`:** Si el negocio tiene archivos Excel con pagos > deuda (incluso como error), este blindaje los bloqueará. Requiere política de negocio.
4. **Refactor de `apply_credit_payment` (v1):** Aunque es potencialmente inseguro, no se usa en el flujo actual. Eliminarlo o restringirlo puede romper scripts o procesos batch desconocidos. Investigar primero si alguien lo llama directamente.

### E. Recomendación final

**Ejecutar en este orden exacto:**

1. **Semana 1, Día 1-2:** Ejecutar queries de auditoría A-E. **Sin esta evidencia, no se debe tocar ninguna lógica de importación ni cálculo.**
2. **Semana 1, Día 3:** Si `operation_number` tiene 0 duplicados, aplicar `UNIQUE` + índices compuestos. Esto es blindaje estructural, no funcional.
3. **Semana 1, Día 4-5:** Analizar resultados.
   - Si A=0, B=0, C=0, E=0: El módulo está sano. Los blindajes son preventivos. Aprobar `IMPORT_PAYMENT_NOT_FULLY_ALLOCATED` y fix de redondeo.
   - Si A>0 o B>0 o C>0: **Detener todo.** Documentar casos. El blindaje de importación podría romper un estado que "funciona" aunque esté mal. Necesita corrección manual caso por caso antes de blindar.
4. **Semana 2:** Aplicar blindajes de importación aprobados + fix de redondeo.
5. **Semana 3:** Alinear `is_active` en métricas comerciales + documentación.

**Regla de oro:** *No blindar lo que no está roto, a menos que el blindaje sea puramente estructural (índices, UNIQUE) y no afecte datos existentes.*

---

**No se modificó código. No se crearon migraciones. Este documento es el plan de ejecución para aprobación.**
