# FASE 4.1 — Auditoría de `calculateSummary()` y Manejo de Sobrepagos

## 1. Localización de todas las implementaciones

### `calculateSummary()` — Implementación única en TypeScript
**Archivo:** `lib/services/creditAccountService.ts` (líneas 25-66)

```typescript
function calculateSummary(
  account: {
    id: string;
    customer_id: string;
    operation_number: string | null;
    product_name: string;
    quantity: number;
    installment_count: number;
    installment_amount: number;
    sale_date: string;
    notes: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    origin_month?: number | null;
    origin_year?: number | null;
  },
  installments: { original_amount: number; paid_amount: number; status: string }[]
): CreditAccountSummary {
  const total = Number(account.installment_amount) * account.installment_count;
  const paid = installments.reduce((sum, inst) => sum + Number(inst.paid_amount), 0);
  return {
    id: account.id,
    customerId: account.customer_id,
    operationNumber: account.operation_number,
    productName: account.product_name,
    quantity: account.quantity,
    installmentCount: account.installment_count,
    installmentAmount: Number(account.installment_amount),
    saleDate: account.sale_date,
    notes: account.notes ?? '',
    isActive: account.is_active,
    createdAt: account.created_at,
    updatedAt: account.updated_at,
    originMonth: account.origin_month ?? null,
    originYear: account.origin_year ?? null,
    total,
    paid,
    remaining: Math.max(0, total - paid),          // <-- LÍNEA CRÍTICA
    paymentCount: installments.filter((inst) => inst.status === 'PAID' || inst.status === 'PARTIAL').length,
  };
}
```

**Llamadas:**
- `listCreditAccountSummaries()` (línea 153)
- `getCreditAccountDetail()` (línea 203)
- `createCreditAccount()` (línea 252, para cuenta nueva sin cuotas)

---

### `remaining` — Usos en modelo y UI

| Archivo | Línea | Uso |
|---------|-------|-----|
| `lib/types.ts` | 185 | `CreditAccountSummary.remaining: number` |
| `lib/types.ts` | 237 | `CreditInstallment.remainingAmount: number` |
| `lib/types.ts` | 316 | `ImportPortfolioRow.remainingAmount: number` |
| `lib/services/creditAccountService.ts` | 63 | `remaining: Math.max(0, total - paid)` |
| `lib/services/creditAccountService.ts` | 158 | `statusFilter === 'active'` → `remaining > 0` |
| `lib/services/creditAccountService.ts` | 160 | `statusFilter === 'finished'` → `remaining <= 0` |
| `lib/services/creditAccountService.ts` | 266 | `registerCreditPayment` valida `input.amount > detail.remaining` |
| `lib/services/importPortfolioService.ts` | 193 | `remainingAmount = parseNumber(...) ?? Math.max(0, totalAmount - accumulatedPayment)` |
| `lib/repositories/creditAccountRepository.ts` | 37 | `DbCreditInstallment.remaining_amount` |
| `lib/repositories/creditAccountRepository.ts` | 333 | Mapeo `remainingAmount` en repo legacy |
| `lib/financial/collectionHelpers.ts` | 15 | `isInstallmentOverdue` → `remainingAmount > 0` |
| `lib/financial/collectionHelpers.ts` | 21, 23 | `calculateSaleCollectionStatus` → `remainingAmount <= 0` = 'PAID' |
| `lib/financial/collectionHelpers.ts` | 29 | `calculateCustomerDebt` → suma `remainingAmount` |
| `components/Admin/Credit/CreditAccountsTable.tsx` | 58 | Muestra `acc.remaining` en tabla |
| `components/Admin/Credit/CreditAccountsTable.tsx` | 63 | Estado visual: `remaining <= 0` = 'Pagado' |
| `components/Admin/Credit/CreditAccountDetailView.tsx` | 44 | `getAccountStatusLabel` → `remaining <= 0` = 'Finalizada' |
| `components/Admin/Credit/CreditAccountDetailView.tsx` | 145 | Color del saldo: `remaining > 0 ? '#991b1b' : '#065f46'` |
| `components/Admin/Credit/CreditAccountDetailView.tsx` | 320 | Oculta formulario de pago si `remaining <= 0` |
| `components/Admin/Credit/CreditPaymentForm.tsx` | 5, 18, 40, 72 | Input `max={remaining}`; valida `value > remaining` |
| `components/Admin/Credit/creditExport.ts` | 12, 27, 28 | Exporta `remaining` a Excel; estado derivado de `remaining` |
| `supabase/migrations/202606010003_credit_installments.sql` | 8 | `remaining_amount numeric(12,2) not null check (remaining_amount >= 0)` |
| `supabase/migrations/202606010003_credit_installments.sql` | 203 | `check (paid_amount + remaining_amount = original_amount)` |
| `supabase/migrations/202606010003_credit_installments.sql` | 149 | `apply_credit_payment` itera `remaining_amount > 0` |
| `supabase/migrations/202606020001_credit_portfolio_update.sql` | 271 | `import_credit_portfolio_row` itera `remaining_amount > 0` |
| `supabase/migrations/202606080001_fix_credit_origin_period.sql` | 361 | `register_credit_payment` itera `remaining_amount > 0` |
| `supabase/migrations/202606020001_credit_portfolio_update.sql` | 39 | `get_credit_dashboard` usa `sum(ci.remaining_amount)` como pending |
| `supabase/migrations/202606020001_credit_portfolio_update.sql` | 94 | `active_accounts` = `pending > 0`; `finished_accounts` = `pending = 0` |

---

## 2. Verificación de lógica que oculta sobrepagos

### Hallazgo A: `Math.max(0, total - paid)` en `calculateSummary`
**Línea:** `lib/services/creditAccountService.ts:63`

```typescript
remaining: Math.max(0, total - paid),
```

**Efecto:**
- Si `paid > total`, `remaining` se reporta como `0` en vez de un número negativo.
- El campo `paid` sí se expone tal cual en `CreditAccountSummary`.
- `total` se calcula como `installment_amount * installment_count`.
- `paid` se calcula como `SUM(installments.paid_amount)`.

### Hallazgo B: `Math.max(0, totalAmount - accumulatedPayment)` en importación
**Línea:** `lib/services/importPortfolioService.ts:193`

```typescript
const remainingAmount = parseNumber(findValue(row, headers, ['RESTANTE', 'SALDO'])) ?? Math.max(0, totalAmount - accumulatedPayment);
```

**Efecto:**
- Si el Excel tiene `accumulatedPayment > totalAmount`, el preview calcula `remainingAmount = 0`.
- La UI de preview no detectará la inconsistencia a menos que el usuario vea el warning (línea 338-339), que solo compara `remainingAmount` con `total - accumulatedPayment`.
- Pero como `remainingAmount` se fuerza a `Math.max(0, ...)`, el warning `Math.abs(row.remainingAmount - (row.totalAmount - row.accumulatedPayment)) > 1` podría no saltar si `remainingAmount` fue coaccionado a `0` y `totalAmount - accumulatedPayment` es negativo. Ejemplo: `total = 100`, `accumulated = 110`. `Math.max(0, -10) = 0`. `remainingAmount = 0`. `total - accumulated = -10`. `Math.abs(0 - (-10)) = 10 > 1` → **sí salta el warning**. OK, el warning funciona.
- PERO el pago sí se importa. El `accumulatedPayment` no se usa en el RPC; el RPC recibe el array `payments`. Si el Excel tiene pagos mensuales que suman más que la deuda, el RPC los inserta todos.

### Hallazgo C: `Math.max(0, Math.floor(diffMs / 86400000))` en días vencidos
**Línea:** `lib/financial/collectionHelpers.ts:12`

```typescript
return Math.max(0, Math.floor(diffMs / 86400000));
```

**Efecto:** No relevante para sobrepagos; solo evita días negativos.

---

## 3. ¿Dónde se usa `remaining` y qué depende de él?

### APIs que consumen `remaining`
| API | Fuente | Dependencia de `remaining` |
|-----|--------|---------------------------|
| `GET /api/admin/credit-accounts` | `listCreditAccountSummaries` | Filtra `active`/`finished` por `remaining` |
| `GET /api/admin/credit-accounts?id` | `getCreditAccountDetail` | Expone `remaining` en detalle |
| `POST /api/admin/credit-accounts/[id]/payments` | `registerCreditPayment` | Valida `amount <= detail.remaining` antes de llamar al RPC |
| `GET /api/admin/credit-accounts/overdue` | `getCollectionRoute` | No usa `remaining` directamente; usa `remaining_amount` de cuotas en SQL |
| `GET /api/admin/credit-accounts/commercial-metrics` | `get_credit_commercial_metrics` | No usa `remaining` directamente; usa `total_remaining` de cuotas en SQL |
| `GET /api/admin/credit-accounts/control-mensual` | `get_credit_monthly_control` | Usa `ai.total_remaining` de cuotas en SQL |

### Pantallas que dependen de `remaining`
| Componente | Campo | Consecuencia si `remaining` oculta un sobrepago |
|------------|-------|---------------------------------------------------|
| `CreditAccountsTable` | `remaining` | Muestra `$0` en vez de saldo negativo |
| `CreditAccountsTable` | Estado visual | Muestra "Pagado" en vez de "Sobrepago" |
| `CreditAccountDetailView` | `remaining` | Muestra `$0` en color verde |
| `CreditAccountDetailView` | Estado | Muestra "Finalizada" |
| `CreditAccountDetailView` | Formulario de pago | Se oculta (`remaining > 0` check) |
| `CreditPaymentForm` | `max={remaining}` | Input limitado a `$0` |
| `creditExport.ts` | `Restante` | Exporta `$0` |
| `creditExport.ts` | `Estado` | Exporta "Finalizada" |
| `CreditDashboardSection` | `totalPending` | No usa `remaining` directamente; usa `get_credit_dashboard` |

---

## 4. ¿El sistema permite sobrepagos?

### Pagos manuales (vía `registerCreditPayment` en TypeScript + `register_credit_payment` en SQL)
**Archivo:** `lib/services/creditAccountService.ts` (líneas 255-283)
```typescript
if (input.amount > detail.remaining) {
  throw new Error('PAYMENT_EXCEEDS_DEBT');
}
```

**Archivo:** `supabase/migrations/202606080001_fix_credit_origin_period.sql` (líneas 324-336)
```sql
SELECT COALESCE(SUM(remaining_amount), 0) INTO v_account_remaining
FROM credit_installments
WHERE credit_account_id = p_credit_account_id;

IF p_amount > v_account_remaining THEN
  RAISE EXCEPTION 'PAYMENT_EXCEEDS_DEBT';
END IF;
```

**Veredicto:** **NO permite sobrepagos** en pagos manuales. Tanto el backend TS como el RPC SQL rechazan pagos que exceden la deuda restante de las cuotas.

### Pagos vía importación de cartera (`import_credit_portfolio_row`)
**Archivo:** `supabase/migrations/202606020001_credit_portfolio_update.sql` (líneas 249-301)

La función `import_credit_portfolio_row` inserta los pagos en `credit_payments` y luego aplica FIFO a las cuotas. **No tiene validación** de:
1. `total_payments <= total_debt`.
2. `v_remaining_to_allocate <> 0` al final del loop (no hay `PAYMENT_NOT_FULLY_ALLOCATED`).

```sql
for v_payment in select value from jsonb_array_elements(p_data->'payments') loop
  insert into credit_payments (...) values (...);
  v_remaining_to_allocate := (v_payment->>'amount')::numeric;
  for v_installment in ... loop
    exit when v_remaining_to_allocate <= 0;
    v_allocation_amount := least(v_remaining_to_allocate, v_installment.remaining_amount);
    update credit_installments ...;
    v_remaining_to_allocate := v_remaining_to_allocate - v_allocation_amount;
  end loop;
  -- NO hay: IF v_remaining_to_allocate <> 0 THEN RAISE EXCEPTION ...
end loop;
```

**Veredicto:** **SÍ permite sobrepagos** en la importación. Si el monto de un pago histórico importado excede el `remaining_amount` de las cuotas, el sobrante queda en `v_remaining_to_allocate` sin asignar, pero el pago ya fue insertado en `credit_payments`.

### ¿Qué pasa con el sobrepago importado?
- El `credit_payments` queda con `amount = 1000` (ejemplo).
- Las cuotas solo absorben hasta su `remaining_amount`. La suma de `paid_amount` de cuotas nunca supera `original_amount` (constraint SQL).
- `calculateSummary` calcula `paid = SUM(installments.paid_amount)`.
- Como `sum(paid_amount) <= sum(original_amount) = total`, `calculateSummary` nunca ve `paid > total`.
- El excedente en `credit_payments` queda **huérfano** (sin `credit_payment_allocations` vinculadas).
- **Impacto:** `totalCollected` del dashboard (que suma `credit_payments.amount`) será MAYOR que `totalFinanced - totalPending`. La cuadratura contable se rompe silenciosamente.

### ¿Existen datos históricos con `paid > total`?
- **No verificable offline.** No hay scripts de análisis ni queries de auditoría en el repo.
- **Recomendación:** Ejecutar en producción:
  ```sql
  SELECT ca.id, ca.operation_number,
         ca.installment_amount * ca.installment_count as total,
         SUM(ci.paid_amount) as paid,
         SUM(ci.paid_amount) - (ca.installment_amount * ca.installment_count) as diff
  FROM credit_accounts ca
  JOIN credit_installments ci ON ci.credit_account_id = ca.id
  GROUP BY ca.id
  HAVING SUM(ci.paid_amount) > (ca.installment_amount * ca.installment_count);
  ```
  Y también:
  ```sql
  SELECT cp.credit_account_id, SUM(cp.amount) as total_payments,
         SUM(ci.paid_amount) as total_allocated
  FROM credit_payments cp
  JOIN credit_installments ci ON ci.credit_account_id = cp.credit_account_id
  GROUP BY cp.credit_account_id
  HAVING SUM(cp.amount) > SUM(ci.paid_amount);
  ```

---

## 5. Impacto funcional

### Impacto A: Pérdida de auditabilidad
`calculateSummary` oculta cualquier discrepancia de redondeo o de importación. Si `paid > total`, el sistema reporta `remaining = 0` como si todo estuviera correcto. Un administrador no puede ver que hay un problema sin hacer queries directos a la base de datos.

### Impacto B: Cuadratura imposible
El dashboard (`get_credit_dashboard`) calcula:
- `totalFinanced = SUM(installment_amount * installment_count)`
- `totalCollected = SUM(credit_payments.amount)`  ← Nota: suma la tabla de pagos, no las cuotas
- `totalPending = totalFinanced - totalCollected`

Si la importación dejó pagos huérfanos, `totalCollected > totalFinanced` y `totalPending` podría ser negativo. El SQL del dashboard usa `coalesce(sum(ca.installment_amount * ca.installment_count), 0) - coalesce(sum(cp.amount), 0)`, lo que **podría devolver un número negativo**. El TypeScript no valida esto:
```typescript
totalPending: Number(row.total_pending),
```
El dashboard mostraría un "Total Pendiente" negativo, lo cual es un bug visible para el usuario.

### Impacto C: Inconsistencia de estado
- `listCreditAccountSummaries` filtra por `remaining > 0` para "active".
- Si `remaining = 0`, la cuenta se marca como "finished".
- Pero si hubo un sobrepago, la cuenta debería estar en un estado de "revisión" o "sobrepago", no "finalizada".
- El formulario de pago se oculta (`remaining <= 0`), impidiendo que el usuario registre un ajuste o devolución.

### Impacto D: Riesgo de redondeo
`generate_credit_installments` usa `trunc(...)` para calcular cuotas. Si `installment_amount * installment_count` no es exactamente igual a la suma de `original_amount` de las cuotas generadas, `calculateSummary` puede mostrar `remaining = 0` o `remaining = 0.01` incorrectamente.

Ejemplo:
- `installment_amount = 33.33`, `installment_count = 3`
- `total = 99.99` (según `calculateSummary`)
- Cuotas generadas: `33.33, 33.33, 33.34` → `sum(original_amount) = 100.00`
- Si todas pagadas, `paid = 100.00`, `total = 99.99`, `remaining = Math.max(0, -0.01) = 0`.
- Oculta un centavo de discrepancia. El dashboard SQL usa `sum(ci.original_amount)` para `total_debt` y `sum(ci.remaining_amount)` para `pending`, por lo que SQL sí vería `0` correctamente. El problema es que `calculateSummary` usa `installment_amount * installment_count` para `total`, no la suma de cuotas. Esto genera una discrepancia entre el frontend (`total = 99.99`) y el SQL (`total_debt = 100.00`).

---

## 6. Propuesta técnica

### 6.1 Corrección en `calculateSummary`
**Objetivo:** Exponer la verdad numérica sin ocultar discrepancias.

```typescript
function calculateSummary(
  account: {
    id: string;
    customer_id: string;
    operation_number: string | null;
    product_name: string;
    quantity: number;
    installment_count: number;
    installment_amount: number;
    sale_date: string;
    notes: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    origin_month?: number | null;
    origin_year?: number | null;
  },
  installments: { original_amount: number; paid_amount: number; status: string }[]
): CreditAccountSummary {
  const total = Number(account.installment_amount) * account.installment_count;
  const paid = installments.reduce((sum, inst) => sum + Number(inst.paid_amount), 0);
  const rawRemaining = total - paid;
  return {
    id: account.id,
    customerId: account.customer_id,
    operationNumber: account.operation_number,
    productName: account.product_name,
    quantity: account.quantity,
    installmentCount: account.installment_count,
    installmentAmount: Number(account.installment_amount),
    saleDate: account.sale_date,
    notes: account.notes ?? '',
    isActive: account.is_active,
    createdAt: account.created_at,
    updatedAt: account.updated_at,
    originMonth: account.origin_month ?? null,
    originYear: account.origin_year ?? null,
    total,
    paid,
    remaining: Math.max(0, rawRemaining),          // UI-friendly: no mostrar negativo
    overpayment: rawRemaining < 0 ? Math.abs(rawRemaining) : 0,  // NUEVO: transparencia
    paymentCount: installments.filter((inst) => inst.status === 'PAID' || inst.status === 'PARTIAL').length,
  };
}
```

### 6.2 Agregar `overpayment` a `CreditAccountSummary`
**Archivo:** `lib/types.ts`

```typescript
export interface CreditAccountSummary extends CreditAccount {
  total: number;
  paid: number;
  remaining: number;
  overpayment: number;        // <-- NUEVO
  paymentCount: number;
  customerName?: string;
}
```

### 6.3 Validar importación en el RPC
**Archivo:** `supabase/migrations/202606080001_fix_credit_origin_period.sql` (o nueva migración)

En `import_credit_portfolio_row`, antes de insertar cada pago, validar que el acumulado no excede la deuda:

```sql
-- Dentro del loop de payments:
-- Calcular deuda restante actual antes de aplicar este pago
SELECT COALESCE(SUM(remaining_amount), 0) INTO v_current_remaining
FROM credit_installments
WHERE credit_account_id = v_credit_account_id;

IF (v_payment->>'amount')::numeric > v_current_remaining THEN
  RAISE EXCEPTION 'IMPORT_PAYMENT_EXCEEDS_DEBT: payment % exceeds remaining %',
    (v_payment->>'amount')::numeric, v_current_remaining;
END IF;
```

### 6.4 Agregar `PAYMENT_NOT_FULLY_ALLOCATED` a la importación
**Archivo:** mismo RPC de importación

```sql
-- Al final del loop de asignación de cada pago:
IF v_remaining_to_allocate <> 0 THEN
  RAISE EXCEPTION 'IMPORT_PAYMENT_NOT_FULLY_ALLOCATED';
END IF;
```

### 6.5 UI: Mostrar alerta de sobrepago
**Archivo:** `components/Admin/Credit/CreditAccountDetailView.tsx`

```tsx
{account.overpayment > 0 && (
  <div style={{ background: '#fef3c7', color: '#92400e', padding: 12, borderRadius: 8, marginBottom: 16 }}>
    ⚠️ Sobrepago detectado: {formatCurrency(account.overpayment)}. Verificar datos de importación.
  </div>
)}
```

### 6.6 UI: Mostrar alerta de sobrepago en tabla
**Archivo:** `components/Admin/Credit/CreditAccountsTable.tsx`

```tsx
<td>
  {formatCurrency(acc.remaining)}
  {acc.overpayment > 0 && (
    <span style={{ color: '#92400e', fontSize: 11, display: 'block' }}>
      +{formatCurrency(acc.overpayment)} sobrepago
    </span>
  )}
</td>
```

### 6.7 Unificar `total` en `calculateSummary` con SQL
**Opción A:** Cambiar `calculateSummary` para usar `SUM(installments.original_amount)` en vez de `installment_amount * installment_count`:
```typescript
const total = installments.reduce((sum, inst) => sum + Number(inst.original_amount), 0);
```
Esto elimina discrepancias de redondeo con `generate_credit_installments`.

**Opción B:** Dejar `installment_amount * installment_count` como contrato de negocio, pero agregar un `check` en SQL para que `SUM(original_amount) = installment_amount * installment_count` (difícil con redondeo).

**Recomendación:** Opción A. Es más robusta y alinea frontend con backend.

---

## 7. Diff exacto (propuesta, no aplicar)

### Diff 1: `lib/types.ts`
```diff
 export interface CreditAccountSummary extends CreditAccount {
   total: number;
   paid: number;
   remaining: number;
+  overpayment: number;
   paymentCount: number;
   customerName?: string;
 }
```

### Diff 2: `lib/services/creditAccountService.ts`
```diff
 function calculateSummary(...) {
   const total = Number(account.installment_amount) * account.installment_count;
   const paid = installments.reduce((sum, inst) => sum + Number(inst.paid_amount), 0);
+  const rawRemaining = total - paid;
   return {
     ...,
     total,
     paid,
-    remaining: Math.max(0, total - paid),
+    remaining: Math.max(0, rawRemaining),
+    overpayment: rawRemaining < 0 ? Math.abs(rawRemaining) : 0,
     paymentCount: ...,
   };
 }
```

### Diff 3: `lib/services/creditAccountService.ts` (registerCreditPayment)
```diff
   const detail = await getCreditAccountDetail(accountId);
-  if (input.amount > detail.remaining) {
+  if (input.amount > detail.remaining + detail.overpayment) {
     throw new Error('PAYMENT_EXCEEDS_DEBT');
   }
```
*(Nota: Si el usuario quiere pagar de más, esto debería ser una decisión de negocio. Por ahora, se mantiene la restricción.)*

### Diff 4: `components/Admin/Credit/CreditAccountDetailView.tsx`
```diff
+ {account.overpayment > 0 && (
+   <div style={{ background: '#fef3c7', color: '#92400e', padding: 12, borderRadius: 8, marginBottom: 16 }}>
+     ⚠️ Sobrepago detectado: {formatCurrency(account.overpayment)}
+   </div>
+ )}
```

### Diff 5: `components/Admin/Credit/CreditAccountsTable.tsx`
```diff
- <td>{formatCurrency(acc.remaining)}</td>
+ <td>
+   {formatCurrency(acc.remaining)}
+   {acc.overpayment > 0 && (
+     <span style={{ color: '#92400e', fontSize: 11 }}> +{formatCurrency(acc.overpayment)} sobrepago</span>
+   )}
+ </td>
```

### Diff 6: `supabase/migrations/202606080001_fix_credit_origin_period.sql` (import RPC)
```diff
   for v_payment in select value from jsonb_array_elements(p_data->'payments') loop
+    -- Validar que el pago no excede la deuda restante
+    SELECT COALESCE(SUM(remaining_amount), 0) INTO v_current_remaining
+    FROM credit_installments
+    WHERE credit_account_id = v_credit_account_id;
+
+    IF (v_payment->>'amount')::numeric > v_current_remaining THEN
+      RAISE EXCEPTION 'IMPORT_PAYMENT_EXCEEDS_DEBT';
+    END IF;
+
     insert into credit_payments (...) values (...);
     ...
     v_remaining_to_allocate := v_remaining_to_allocate - v_allocation_amount;
   end loop;
+
+  IF v_remaining_to_allocate <> 0 THEN
+    RAISE EXCEPTION 'IMPORT_PAYMENT_NOT_FULLY_ALLOCATED';
+  END IF;
```

---

## 8. Plan de despliegue

### Paso 1: Preparación (sin tocar producción)
1. Crear rama `feature/audit-calculate-summary-overpayment`.
2. Aplicar Diff 1 y 2 (types + calculateSummary).
3. Agregar tests unitarios:
   - `calculateSummary` con `paid < total` → `remaining > 0`, `overpayment = 0`.
   - `calculateSummary` con `paid = total` → `remaining = 0`, `overpayment = 0`.
   - `calculateSummary` con `paid > total` → `remaining = 0`, `overpayment > 0`.
   - `calculateSummary` con redondeo (33.33 * 3 vs 100.00) → verificar coherencia.

### Paso 2: Validación de datos históricos
1. Ejecutar en staging (con copia de datos de prod):
   ```sql
   SELECT COUNT(*) FROM (
     SELECT ca.id
     FROM credit_accounts ca
     JOIN credit_installments ci ON ci.credit_account_id = ca.id
     GROUP BY ca.id
     HAVING SUM(ci.paid_amount) > (ca.installment_amount * ca.installment_count)
   ) t;
   ```
   ```sql
   SELECT COUNT(*) FROM (
     SELECT cp.credit_account_id
     FROM credit_payments cp
     LEFT JOIN credit_payment_allocations cpa ON cpa.credit_payment_id = cp.id
     GROUP BY cp.credit_account_id
     HAVING SUM(cp.amount) > COALESCE(SUM(cpa.amount), 0)
   ) t;
   ```
2. Si el resultado > 0, documentar las cuentas afectadas y decidir si se corrige manualmente antes del deploy.

### Paso 3: Deploy de la validación de importación (RPC SQL)
1. Aplicar Diff 6 en staging.
2. Ejecutar importación de prueba con un Excel que tenga `accumulatedPayment > totalAmount`.
3. Verificar que la importación falla con `IMPORT_PAYMENT_EXCEEDS_DEBT`.

### Paso 4: Deploy del frontend
1. Aplicar Diff 1, 2, 4, 5 en staging.
2. Verificar que la UI muestra correctamente `overpayment` cuando se simula un dato afectado.
3. Verificar que el listado de "finished" no muestra falsos negativos.

### Paso 5: Deploy a producción
1. Ventana de baja actividad (no importaciones en curso).
2. Deploy SQL primero (Diff 6). Los nuevos errores en importación son deseados.
3. Deploy Next.js (Diffs 1, 2, 4, 5).
4. Monitorear logs de importación y pagos.

---

## 9. Plan de rollback

### Escenario A: El frontend muestra `overpayment` en cuentas que no deberían
1. Revertir el commit de Next.js.
2. El backend SQL con la validación de importación permanece (es deseado).
3. Verificar que la UI vuelve al comportamiento anterior (sin campo `overpayment`).

### Escenario B: La importación falla masivamente por `IMPORT_PAYMENT_EXCEEDS_DEBT`
1. Identificar si el Excel tiene datos legítimos con sobrepagos (ej: un cliente pagó de más intencionalmente).
2. Si es un bug del parser (ej: `totalAmount` mal calculado), corregir el parser y reimportar.
3. Si el negocio decide que los sobrepagos deben permitirse, revertir Diff 6 (rollback del RPC SQL) y re-evaluar la estrategia.

### Escenario C: Discrepancia de redondeo masiva
1. Si `calculateSummary` con `SUM(original_amount)` (Opción A) muestra totales diferentes a lo que el usuario espera, revertir a `installment_amount * installment_count` y documentar el error de redondeo como known issue.

### Rollback de datos
- No hay migración de datos destructiva en esta propuesta. El campo `overpayment` es computado en runtime.
- Si se aplicó Diff 6 (SQL), revertirlo con:
  ```sql
  CREATE OR REPLACE FUNCTION import_credit_portfolio_row(...) ...  -- versión anterior
  ```

---

## 10. Conclusión

`calculateSummary()` es un **único punto de falla** que oculta tres categorías de problemas:
1. **Sobrepagos de importación** (permitidos por el RPC de importación).
2. **Discrepancias de redondeo** entre `installment_amount * installment_count` y `SUM(original_amount)`.
3. **Corruptibilidad futura** si alguien modifica directamente `installments.paid_amount` en SQL.

La propuesta es **mínima y segura**:
- No cambia la base de datos (DDL).
- Agrega un campo computado (`overpayment`) para transparencia.
- Cierra la puerta de importación de sobrepagos.
- No afecta el flujo de pagos manuales (ya es seguro).

**No se modificó código.** Este documento es la base técnica para la decisión de go/no-go.
