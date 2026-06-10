# Auditoría: Asignación de Pagos a Cuotas — Pagos Huérfanos y Divergencia Contable

## 1. Funciones SQL que insertan en `credit_payments` y `credit_payment_allocations`

### 1.1 `register_credit_payment` (v3, 2026-06-08)
**Archivo:** `supabase/migrations/202606080001_fix_credit_origin_period.sql` (líneas 305-401)

**Inserta en `credit_payments`:** Sí (líneas 339-352)
**Inserta en `credit_payment_allocations`:** Sí (líneas 369-377)

**Lógica de asignación:**
- Valida `p_amount <= SUM(remaining_amount)` de cuotas (líneas 330-336).
- Itera cuotas con `remaining_amount > 0` en orden FIFO.
- `v_allocation_amount := LEAST(v_remaining_to_allocate, v_installment.remaining_amount)` (línea 367).
- Al final del loop: `IF v_remaining_to_allocate <> 0 THEN RAISE EXCEPTION 'PAYMENT_NOT_FULLY_ALLOCATED'` (líneas 393-396).

**Veredicto:** **Seguro.** No permite pagos huérfanos. Si la suma de cuotas no absorbe el pago exactamente, la transacción se aborta.

---

### 1.2 `apply_credit_payment` (v1, 2026-06-01)
**Archivo:** `supabase/migrations/202606010003_credit_installments.sql` (líneas 128-181)

**Inserta en `credit_payment_allocations`:** Sí (líneas 157-165)
**NO inserta en `credit_payments`:** Es una función auxiliar que recibe `p_credit_payment_id` ya existente.

**Lógica de asignación:**
- `v_allocation_amount := LEAST(v_remaining_to_allocate, v_installment.remaining_amount)` (línea 155).
- **NO valida** `v_remaining_to_allocate <> 0` al final del loop.
- Si `p_amount > SUM(remaining_amount)`, el sobrante queda en `v_remaining_to_allocate` sin asignar.

**Veredicto:** **Inseguro si se usa con un pago que excede la deuda.** Pero como el flujo de TypeScript (`registerCreditPayment` en el servicio) validaba `amount <= remaining` antes de llamar a `apply_credit_payment`, en la práctica no se disparaba esta condición. **Sin embargo, si alguien llama directamente al RPC con un monto excedente, el pago queda parcialmente sin asignar.**

**Nota:** `apply_credit_payment` fue reemplazado por `register_credit_payment` (v3) que es atómico. Pero la función v1 sigue existiendo en la base de datos si no se eliminó explícitamente.

---

### 1.3 `import_credit_portfolio_row` (v3, 2026-06-08)
**Archivo:** `supabase/migrations/202606080001_fix_credit_origin_period.sql` (líneas 24-149)

**Inserta en `credit_payments`:** Sí (líneas 102-112)
**Inserta en `credit_payment_allocations`:** Sí (líneas 127-131)

**Lógica de asignación:**
- Itera pagos históricos del JSON payload.
- Para cada pago, itera cuotas con `remaining_amount > 0` en orden FIFO.
- `v_allocation_amount := LEAST(v_remaining_to_allocate, v_installment.remaining_amount)` (línea 125).
- **NO valida** `v_remaining_to_allocate <> 0` al final del loop de cada pago.
- **NO valida** que la suma de todos los pagos no exceda la deuda total.

**Veredicto:** **Inseguro.** Si un Excel tiene pagos históricos que suman más que la deuda, o si un pago individual excede el `remaining_amount` restante de las cuotas, el sobrante queda sin asignar. El pago sí se inserta en `credit_payments`.

**Escenario de reproducción:**
1. Importar cuenta con `installment_count = 1`, `installment_amount = 100`.
2. El Excel tiene un pago de `150`.
3. El RPC inserta `credit_payments.amount = 150`.
4. La cuota absorbe `100`. `v_remaining_to_allocate = 50`.
5. No hay más cuotas. Loop termina. `v_remaining_to_allocate = 50` se ignora.
6. Resultado: `SUM(credit_payment_allocations.amount) = 100`, `credit_payments.amount = 150`. Diferencia = 50.

---

### 1.4 `import_credit_portfolio_row` (v2, 2026-06-05)
**Archivo:** `supabase/migrations/202606050002_credit_origin_period.sql` (líneas 13-138)

**Identical** a v3 en la lógica de asignación. Mismo riesgo.

---

### 1.5 `import_credit_portfolio_row` (v1, 2026-06-02)
**Archivo:** `supabase/migrations/202606020001_credit_portfolio_update.sql` (líneas 165-305)

**Identical** a v2/v3 en la lógica de asignación. Mismo riesgo.

---

### 1.6 Resumen de seguridad por función

| Función | Versión | ¿Valida monto vs deuda? | ¿Valida asignación completa? | Riesgo de pago huérfano |
|---------|---------|------------------------|------------------------------|------------------------|
| `register_credit_payment` | v3 (2026-06-08) | **Sí** (línea 334) | **Sí** (línea 394) | **Ninguno** |
| `apply_credit_payment` | v1 (2026-06-01) | **No** | **No** | **Alto** (si se llama directamente) |
| `import_credit_portfolio_row` | v1/v2/v3 | **No** | **No** | **Alto** (importación de Excel con datos inconsistentes) |

---

## 2. Verificación: ¿Existe camino donde `SUM(allocations) < SUM(payments)`?

### Sí. Confirmado.

**Camino 1: Importación de cartera con datos inconsistentes**
- `import_credit_portfolio_row` no valida que `SUM(payments) <= total_debt`.
- No valida que cada pago se asigne completamente.
- Si el Excel tiene `PAGO_ACUMULADO > TOTAL`, el sistema importa todos los pagos pero solo asigna hasta `SUM(original_amount)` de las cuotas.

**Camino 2: `apply_credit_payment` llamado directamente**
- Si un administrador o script llama directamente al RPC `apply_credit_payment` con un `p_amount` mayor a la deuda restante, el pago queda parcialmente sin asignar.
- En el flujo TypeScript actual, esto no ocurre porque `registerCreditPayment` (servicio) valida `amount <= detail.remaining` antes de llamar al RPC.
- Pero si el flujo cambia o si alguien usa SQL directo, el riesgo existe.

**Camino 3: `import_portfolio_batch` en TypeScript**
- `importPortfolioBatch` (líneas 426-474) llama a `importPortfolioRow` (repo) que llama al RPC `import_credit_portfolio_row`.
- No hay validación adicional en el lado de Node.js antes de llamar al RPC.
- El `previewPortfolioFile` sí calcula `remainingAmount` y emite warnings, pero el batch importa las filas que pasan el check de duplicados, sin re-validar la coherencia de pagos.

---

## 3. Queries SQL de auditoría

### 3A. Pagos parcialmente asignados (pago huérfano)
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

**Interpretación:**
- `unallocated_amount > 0` → Pago importado o creado con monto excedente. El sobrante no tiene asignación a cuotas.
- `unallocated_amount < 0` → Imposible bajo las constraints actuales (no hay trigger que impida `SUM(allocations) > payment`), pero debería verificarse.

### 3B. Cuentas donde `SUM(payments) > SUM(installments.paid_amount)`
```sql
SELECT
  ca.id AS account_id,
  ca.operation_number,
  ca.customer_id,
  (ca.installment_amount * ca.installment_count) AS total_financed,
  COALESCE(pay.total_payments, 0) AS total_payments,
  COALESCE(inst.total_paid_installments, 0) AS total_paid_installments,
  COALESCE(pay.total_payments, 0) - COALESCE(inst.total_paid_installments, 0) AS difference
FROM credit_accounts ca
LEFT JOIN (
  SELECT credit_account_id, SUM(amount) AS total_payments
  FROM credit_payments
  GROUP BY credit_account_id
) pay ON pay.credit_account_id = ca.id
LEFT JOIN (
  SELECT credit_account_id, SUM(paid_amount) AS total_paid_installments
  FROM credit_installments
  GROUP BY credit_account_id
) inst ON inst.credit_account_id = ca.id
WHERE COALESCE(pay.total_payments, 0) <> COALESCE(inst.total_paid_installments, 0)
ORDER BY ABS(difference) DESC;
```

**Interpretación:**
- `difference > 0` → Pagos huérfanos. El dinero ingresó pero no se asignó a cuotas.
- `difference < 0` → Imposible lógicamente bajo las constraints de `paid_amount + remaining_amount = original_amount`, pero podría indicar corrupción o modificación manual.

### 3C. Cuentas donde `total_collected > total_financed`
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

**Interpretación:**
- `excess > 0` → La cuenta tiene un "sobrepago" contable. Esto solo puede ocurrir por importación de pagos huérfanos.
- Afecta `get_credit_dashboard` porque `total_collected` (suma de `credit_payments`) puede ser mayor que `total_financed`.

### 3D. Verificación de cuadratura global del dashboard
```sql
SELECT
  'total_financed' AS metric,
  COALESCE(SUM(ca.installment_amount * ca.installment_count), 0)::numeric AS value
FROM credit_accounts ca
WHERE ca.is_active = true

UNION ALL

SELECT
  'total_collected_via_payments' AS metric,
  COALESCE(SUM(cp.amount), 0)::numeric AS value
FROM credit_payments cp
JOIN credit_accounts ca ON ca.id = cp.credit_account_id
WHERE ca.is_active = true

UNION ALL

SELECT
  'total_collected_via_installments' AS metric,
  COALESCE(SUM(ci.original_amount - ci.remaining_amount), 0)::numeric AS value
FROM credit_installments ci
JOIN credit_accounts ca ON ca.id = ci.credit_account_id
WHERE ca.is_active = true

UNION ALL

SELECT
  'total_pending_via_installments' AS metric,
  COALESCE(SUM(ci.remaining_amount), 0)::numeric AS value
FROM credit_installments ci
JOIN credit_accounts ca ON ca.id = ci.credit_account_id
WHERE ca.is_active = true;
```

**Interpretación:**
- `total_collected_via_payments` debe ser igual a `total_collected_via_installments`.
- Si `total_collected_via_payments > total_collected_via_installments`, hay pagos huérfanos.
- `total_pending_via_installments` debe ser igual a `total_financed - total_collected_via_installments`.

### 3E. Verificación de cuadratura del dashboard v2 (2026-06-02)
```sql
-- El dashboard v2 calcula collected como SUM(ci.original_amount - ci.remaining_amount)
-- y total_pending como SUM(ci.remaining_amount).
-- Esto es coherente con las cuotas, pero los monthly metrics usan credit_payments.

-- Verificar si hay diferencia entre collected_installments y collected_payments:
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

**Interpretación:**
- `rounding_error` debe ser `0` (o cercano a `0` por centavos de redondeo).
- Si `rounding_error > 1`, hay un problema de redondeo o de cuadratura.

---

## 4. Confirmación: ¿Qué usa cada módulo?

### Dashboard (`get_credit_dashboard`)

#### v1 (2026-06-01): `supabase/migrations/202606010002_credit_account_tables.sql`
```sql
select
  coalesce(sum(ca.installment_amount * ca.installment_count), 0)::numeric as total_financed,
  coalesce(sum(cp.amount), 0)::numeric as total_collected,
  coalesce(sum(ca.installment_amount * ca.installment_count), 0)::numeric
    - coalesce(sum(cp.amount), 0)::numeric as total_pending,
  ...
from credit_accounts ca
left join lateral (
  select coalesce(sum(cp2.amount), 0) as paid
  from credit_payments cp2
  where cp2.credit_account_id = ca.id
) ca_paid on true
left join credit_payments cp on cp.credit_account_id = ca.id
where ca.is_active = true;
```

**Observación:** `total_collected` usa `sum(cp.amount)` (tabla `credit_payments`). `total_pending` es `total_financed - total_collected`. Si hay pagos huérfanos, `total_pending` puede ser **negativo**.

#### v2 (2026-06-02): `supabase/migrations/202606020001_credit_portfolio_update.sql`
```sql
with account_totals as (
  select
    ca.id as ca_id,
    ca.installment_amount * ca.installment_count as financed,
    coalesce(sum(ci.original_amount - ci.remaining_amount), 0) as collected,
    coalesce(sum(ci.remaining_amount), 0) as pending
  from credit_accounts ca
  left join credit_installments ci on ci.credit_account_id = ca.id
  where ca.is_active = true
  group by ...
)
```

**Observación:** v2 usa `credit_installments` para calcular `collected` y `pending`. Esto es **más coherente** que v1, pero los `monthly_collection` todavía usan `credit_payments`:
```sql
select date_trunc('month', payment_date) as month, sum(amount)::numeric as collected
from credit_payments
group by 1
```

**Divergencia:** Si hay pagos huérfanos, el gráfico mensual de `collected` (que usa `credit_payments`) mostrará más que el `total_collected` del resumen (que usa `credit_installments`).

---

### Métricas Comerciales (`get_credit_commercial_metrics`)

#### v3 (2026-06-08): `supabase/migrations/202606080001_fix_credit_origin_period.sql`
```sql
payment_aggregates AS (
  SELECT
    cp.credit_account_id,
    COALESCE(SUM(cp.amount), 0)::numeric AS total_paid,
    MAX(cp.payment_date) AS last_payment_date
  FROM credit_payments cp
  GROUP BY cp.credit_account_id
)
```

**Observación:** `total_paid` usa `credit_payments.amount`. No filtra por `is_active`. No usa `credit_installments`.

- `current_monthly_collection`: `SUM(cp.amount)` (usando `credit_payments`).
- `finished_cards`: Determina "cuenta terminada" por `aa.total_remaining = 0` (que usa `credit_installments`).

**Divergencia:** Si una cuenta tiene pagos huérfanos, `total_paid` (vía `credit_payments`) será mayor que el `total_paid` real (vía `credit_installments`). Pero `finished_cards` usa `total_remaining = 0` de cuotas, por lo que la cuenta se marcará como terminada correctamente. La métrica `finished_cards` no se rompe, pero `current_monthly_collection` podría incluir pagos que no se asignaron a cuotas.

---

### Control Mensual (`get_credit_monthly_control`)

#### v3 (2026-06-08): `supabase/migrations/202606080001_fix_credit_origin_period.sql`
```sql
account_payments AS (
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
  ...,
  CASE
    WHEN COALESCE(ai.total_remaining, 0) = 0 THEN 'Finalizada'
    WHEN ca.origin_month = ... THEN 'Nueva'
    ELSE 'En curso'
  END AS status,
  COALESCE(ai.total_remaining, 0) AS remaining_amount,
  ...
FROM credit_accounts ca
LEFT JOIN account_payments ap ON ap.credit_account_id = ca.id
LEFT JOIN account_installments ai ON ai.credit_account_id = ca.id
WHERE ca.is_active = true;
```

**Observación:** `status` y `remaining_amount` se derivan de `credit_installments`. `last_payment_date` se deriva de `credit_payments`. Si hay pagos huérfanos, `last_payment_date` podría ser la fecha del pago huérfano, pero el `status` seguirá siendo correcto.

---

### Cobranza (`get_credit_collection_route`)

#### v3 (2026-06-08): `supabase/migrations/202606080001_fix_credit_origin_period.sql`
```sql
with account_summary as (
  select
    ca.id as ca_id,
    count(ci.id) as total_installments,
    count(ci.id) filter (where ci.status = 'PAID') as paid_count,
    count(ci.id) filter (where ci.status = 'OVERDUE') as overdue_count,
    sum(ci.original_amount) as total_debt,
    sum(ci.remaining_amount) filter (where ci.status = 'OVERDUE') as overdue_amount,
    ...
  from credit_accounts ca
  join credit_installments ci on ci.credit_account_id = ca.id
  where ca.is_active = true
  group by ca.id, ca.customer_id, ca.product_name, ca.operation_number
  having count(ci.id) filter (where ci.status = 'OVERDUE') > 0
)
```

**Observación:** 100% basado en `credit_installments`. No toca `credit_payments`. Los pagos huérfanos **no afectan** la cobranza.

---

## 5. Resumen de divergencia entre mundos

| Módulo | Fuente de `collected` | Fuente de `pending` | Fuente de `status` | ¿Afectado por pagos huérfanos? |
|--------|----------------------|---------------------|-------------------|-------------------------------|
| Dashboard v1 | `credit_payments` | `credit_payments` | `credit_payments` | **Sí** (total_pending negativo) |
| Dashboard v2 | `credit_installments` | `credit_installments` | `credit_installments` | **No** (en resumen) |
| Dashboard v2 (monthly) | `credit_payments` | N/A | N/A | **Sí** (gráfico mensual) |
| Métricas comerciales | `credit_payments` | `credit_installments` | `credit_installments` | **Parcial** (cobranza actual) |
| Control mensual | `credit_payments` (solo fecha) | `credit_installments` | `credit_installments` | **No** (status y remaining) |
| Cobranza | `credit_installments` | `credit_installments` | `credit_installments` | **No** |
| `calculateSummary` | `credit_installments` | `credit_installments` | `credit_installments` | **No** |

**Divergencia crítica:**
- Si hay pagos huérfanos, el **gráfico mensual de cobranzas** (dashboard v2) mostrará más dinero recaudado que el **resumen de cuenta corriente** (dashboard v2 usa `credit_installments` para el resumen, pero `credit_payments` para el gráfico mensual).
- El usuario verá: "Total Cobrado: $X" (correcto, basado en cuotas) y "Evolución Mensual: $Y" (incorrecto, basado en pagos, con Y > X si hay pagos huérfanos).
- **Esto es una inconsistencia de UX visible.**

---

## 6. Informe final

### 6.1 Riesgo real
**Probabilidad:** **Media.** Depende de la calidad de los Excel importados.
- Si los Excel de importación tienen `PAGO_ACUMULADO > TOTAL` o pagos mensuales que suman más que la deuda, el sistema importará pagos huérfanos.
- La función `previewPortfolioFile` emite un warning (`RESTANTE difiere de total - acumulado`), pero no bloquea la importación.
- El batch `importPortfolioBatch` importa todas las filas que no tienen duplicados de `operation_number`, sin re-validar coherencia de pagos.

**Impacto:** **Alto.**
- `total_pending` del dashboard v1 podría ser negativo.
- El gráfico mensual de cobranzas (dashboard v2) diverge del resumen de cuenta corriente.
- `current_monthly_collection` de métricas comerciales incluye pagos que no se asignaron a cuotas.
- La cuadratura contable entre `credit_payments` y `credit_installments` se rompe.
- Un administrador no puede detectar esto sin ejecutar queries SQL de auditoría.

### 6.2 Riesgo teórico
- Si alguien llama directamente al RPC `apply_credit_payment` (v1) con un monto mayor a la deuda, el pago queda parcialmente sin asignar.
- La función `apply_credit_payment` sigue existiendo en la base de datos (a menos que se haya eliminado manualmente). No hay `DROP FUNCTION` en las migraciones posteriores.
- Si el frontend `registerCreditPayment` (servicio TypeScript) se modifica para no validar `amount <= remaining`, el riesgo se materializa en pagos manuales.

### 6.3 Cantidad de registros afectados
**No determinable offline.** Requiere ejecutar los queries 3A, 3B, 3C en la base de datos de producción.

**Queries a ejecutar para contar:**
```sql
-- Cuentas con pagos huérfanos (Query 3B)
SELECT COUNT(*) FROM (
  SELECT ca.id
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
) t;

-- Pagos huérfanos individuales (Query 3A)
SELECT COUNT(*) FROM (
  SELECT cp.id
  FROM credit_payments cp
  LEFT JOIN credit_payment_allocations cpa ON cpa.credit_payment_id = cp.id
  GROUP BY cp.id
  HAVING cp.amount <> COALESCE(SUM(cpa.amount), 0)
) t;

-- Cuentas con total_collected > total_financed (Query 3C)
SELECT COUNT(*) FROM (
  SELECT ca.id
  FROM credit_accounts ca
  LEFT JOIN credit_payments cp ON cp.credit_account_id = ca.id
  GROUP BY ca.id
  HAVING COALESCE(SUM(cp.amount), 0) > (ca.installment_amount * ca.installment_count)
) t;
```

### 6.4 Prioridad de corrección
**Prioridad: ALTA.**

Razones:
1. **Impacto contable visible:** El dashboard muestra números que no cuadran.
2. **Difícil de detectar:** No hay UI que alerte sobre pagos huérfanos.
3. **Acumulativo:** Cada importación de cartera con datos inconsistentes agrava la divergencia.
4. **Baja complejidad de fix:** Agregar una validación `IF v_remaining_to_allocate <> 0 THEN RAISE EXCEPTION` en `import_credit_portfolio_row` y una validación previa de `SUM(payments) <= total_debt` es trivial.
5. **No hay workaround:** El usuario no puede corregir pagos huérfanos desde la UI. Debe hacerse vía SQL directo.

---

## 7. Conclusión de la auditoría

**Hallazgo principal:** `import_credit_portfolio_row` (v1, v2, v3) tiene un **bug de diseño** que permite importar pagos que no pueden asignarse completamente a cuotas. Esto genera:
- Pagos huérfanos en `credit_payments` (sin `credit_payment_allocations` vinculadas).
- Divergencia entre el resumen de cuenta corriente (que usa `credit_installments`) y el gráfico mensual de cobranzas (que usa `credit_payments`).
- Posible `total_pending` negativo en el dashboard.

**Hallazgo secundario:** `apply_credit_payment` (v1) sigue existiendo como función potencialmente insegura. Aunque el flujo actual de TypeScript no la llama con montos excedentes, representa un riesgo si se usa directamente.

**Hallazgo terciario:** `register_credit_payment` (v3) es **seguro** y no permite pagos huérfanos. La validación `PAYMENT_NOT_FULLY_ALLOCATED` y `PAYMENT_EXCEEDS_DEBT` son correctas.

**Recomendación:** No se aplica en esta auditoría (según instrucciones), pero la base técnica está documentada para una futura corrección del RPC de importación.

**No se modificó código. No se crearon migraciones. Solo auditoría.**
