# Auditoría Técnica: `credit_accounts.is_active` y `calculateSummary()`

## 1. Referencias completas encontradas

### `credit_accounts.is_active`
| Ubicación | Línea(s) | Uso |
|-----------|----------|-----|
| `supabase/migrations/202606010002_credit_account_tables.sql` | 10, 26 | Definición DDL: `boolean not null default true` + índice `idx_credit_accounts_is_active`. |
| `lib/repositories/creditAccountRepository.ts` | 13, 67 | `DbCreditAccount.is_active` + query `.eq('is_active', true)` en `getCreditAccounts()`. |
| `lib/services/creditAccountService.ts` | 36, 56 | `calculateSummary` recibe `is_active` y lo mapea a `isActive` en `CreditAccountSummary`. |
| `lib/types.ts` | 72, 163 | `CreditAccount.isActive` y `CreditAccountSummary.isActive`. |
| `supabase/migrations/202606010002_credit_account_tables.sql` | 83 | `get_credit_dashboard()` filtra `WHERE ca.is_active = true`. |
| `supabase/migrations/202606010003_credit_installments.sql` | 240 | `get_credit_collection_route()` filtra `WHERE ca.is_active = true`. |
| `supabase/migrations/202606020001_credit_portfolio_update.sql` | 42, 140 | `get_credit_dashboard()` (v2) y `get_credit_collection_route()` (v2) filtran `is_active`. |
| `supabase/migrations/202606050001_credit_portfolio_clean_and_metrics.sql` | 194 | `get_credit_monthly_control()` filtra `WHERE ca.is_active = true`. |
| `supabase/migrations/202606080001_fix_credit_origin_period.sql` | 298 | `get_credit_monthly_control()` (v3) filtra `WHERE ca.is_active = true`. |
| `supabase/migrations/202606020001_credit_portfolio_update.sql` | 220 | `import_credit_portfolio_row()` inserta `credit_accounts` sin `is_active` → toma `default true`. |
| `supabase/migrations/202606050002_credit_origin_period.sql` | 59 | `import_credit_portfolio_row()` (v2) inserta sin `is_active` → `default true`. |
| `supabase/migrations/202606080001_fix_credit_origin_period.sql` | 70 | `import_credit_portfolio_row()` (v3) inserta sin `is_active` → `default true`. |
| `tests/helpers/seedFinancialFixtures.mjs` | 7 | Seed de fixtures: `is_active: true`. |
| `../database/audit_credit_schema.sql` | 80 | Índice `idx_credit_accounts_is_active` auditado. |

### `calculateSummary()`
| Ubicación | Línea(s) | Uso |
|-----------|----------|-----|
| `lib/services/creditAccountService.ts` | 25-66 | **Definición única**. |
| `lib/services/creditAccountService.ts` | 153 | Llamada en `listCreditAccountSummaries()`. |
| `lib/services/creditAccountService.ts` | 203 | Llamada en `getCreditAccountDetail()`. |
| `lib/services/creditAccountService.ts` | 252 | Llamada en `createCreditAccount()` (cuenta nueva, sin cuotas). |

---

## 2. Identificación funcional de `is_active`

### ¿Qué significa?
En `credit_accounts`, `is_active` es un **flag de visibilidad operativa**. Indica si la cuenta está “viva” en el sistema para ser listada, cobrada y reportada. **No es un estado de pago** (eso se deriva de las cuotas/pagos). Es un campo semántico de negocio independiente del saldo.

### ¿Quién lo modifica?
**Nadie en la aplicación actual.**
- No existe endpoint de API que exponga `PATCH /credit-accounts/:id { is_active: false }`.
- No existe UI de administración que permita desactivar una cuenta de crédito.
- Las únicas mutaciones sobre `credit_accounts` son:
  1. `INSERT` (creación manual o importación) con `default true`.
  2. `DELETE` (masivo, vía `clean_credit_portfolio()`).

### ¿Quién lo consulta?
- **Frontend (listado)**: `getCreditAccounts()` siempre aplica `.eq('is_active', true)`.
- **Dashboard financiero**: `get_credit_dashboard()` filtra `is_active = true`.
- **Ruta de cobranza**: `get_credit_collection_route()` filtra `is_active = true`.
- **Control mensual**: `get_credit_monthly_control()` filtra `is_active = true`.
- **Detalle individual**: `getCreditAccountById()` **NO** filtra por `is_active` (se puede ver una cuenta inactiva por ID).
- **Métricas comerciales**: `get_credit_commercial_metrics()` **NO** filtra por `is_active` (LEE TODAS). Esto es una **inconsistencia crítica**.

### ¿Qué pantallas dependen de él?
| Pantalla/Flujo | Fuente de datos | Depende de `is_active` | Nota |
|----------------|-----------------|------------------------|------|
| Listado de cuentas (tabla de crédito) | `listCreditAccountSummaries` → `getCreditAccounts` | **Sí** | Si `is_active = false`, la cuenta no aparece. |
| Dashboard de crédito (KPIs) | `getCreditDashboard` → `get_credit_dashboard()` | **Sí** | Cuentas inactivas se excluyen de totales. |
| Ruta de cobranza (morosos) | `getCollectionRoute` → `get_credit_collection_route()` | **Sí** | Cuentas inactivas no se muestran. |
| Control mensual | `get_credit_monthly_control()` | **Sí** | Cuentas inactivas no se muestran. |
| Métricas comerciales | `get_credit_commercial_metrics()` | **NO** | Lee todas las cuentas, activas o no. |
| Detalle de cuenta | `getCreditAccountById` | **No** | Se puede consultar por UUID independientemente. |
| Importación de cartera | `import_credit_portfolio_row()` | **Indirecto** | Inserta con `default true`. |
| Pago de cuotas | `register_credit_payment()` | **No** | No valida `is_active` al pagar. |

---

## 3. Verificación: ¿Puede romper el trigger propuesto?

Se asume el trigger propuesto como:
> *"Cuando todas las cuotas de una `credit_account` tengan `remaining_amount = 0`, actualizar `credit_accounts.is_active = false` (y viceversa)."*

### Dashboard (Riesgo: **ALTO**)
- `get_credit_dashboard()` filtra `is_active = true` y calcula `total_financed`, `total_collected`, `total_pending`.
- Si una cuenta terminada se desactiva automáticamente, **desaparece del dashboard** y los totales históricos cambian.
- **Impacto**: Un usuario que pagó hace 3 meses ya no suma al `total_collected`. El dashboard histórico se volvería incorrecto/dependiente del momento en que se pagó.
- **Conclusión**: El trigger rompe la integridad histórica del dashboard.

### Cobranza (Riesgo: **BAJO**)
- `get_credit_collection_route()` ya filtra por cuentas con cuotas vencidas y `is_active = true`.
- Una cuenta liquidada no debería aparecer en cobranza.
- **Conclusión**: No rompe; es comportamiento deseado.

### Reportes (Riesgo: **ALTO**)
- `get_credit_monthly_control()` filtra `is_active = true`.
- Si una cuenta terminada en enero se desactiva en febrero, el reporte de enero ya no la mostrará si se regenera. Los reportes dejan de ser reproducibles.
- `get_credit_commercial_metrics()` no filtra por `is_active`, por lo que generará métricas inconsistentes con el dashboard (ej: `finished_cards` contaría cuentas inactivas, pero el `active_accounts` del dashboard no las contaría).
- **Conclusión**: Se rompe la reproducibilidad y la consistencia entre reportes.

### Importación (Riesgo: **MEDIO**)
- `import_credit_portfolio_row()` inserta `credit_accounts` con `is_active = true` y luego importa pagos históricos.
- Si la importación liquida la cuenta inmediatamente, el trigger la desactivaría **antes de que el usuario la vea en el listado**.
- **Impacto**: El usuario importa 100 cuentas, 30 ya terminadas. El listado mostrará solo 70. El usuario podría pensar que la importación falló.
- **Conclusión**: Confusión operativa; no es un error técnico, pero sí UX roto.

### RLS (Riesgo: **MEDIO**)
- Las políticas de `credit_accounts` y `credit_installments` usan `profiles.is_active = true` (del usuario admin), no `credit_accounts.is_active`.
- El trigger no afecta RLS directamente.
- **Conclusión**: No hay riesgo en RLS.

### Resumen de ruptura
| Área | ¿Se rompe? | Severidad |
|------|------------|-----------|
| Dashboard | **Sí** (histórico se pierde) | Alto |
| Cobranza | No | Bajo |
| Reportes | **Sí** (inconsistencia + no reproducible) | Alto |
| Importación | **Sí** (UX) | Medio |
| Detalle individual | No | Bajo |

---

## 4. Análisis de `calculateSummary()`

### Implementación completa
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
    remaining: Math.max(0, total - paid),
    paymentCount: installments.filter((inst) => inst.status === 'PAID' || inst.status === 'PARTIAL').length,
  };
}
```

### ¿Por qué usa `Math.max(0, ...)`?
El objetivo declarado es **evitar mostrar saldo negativo en la UI** si por alguna razón los pagos acumulados superan el total financiado (por redondeo, errores de importación o pagos manuales).

### ¿Está ocultando sobrepagos?
**Sí.**
- Si `paid > total`, `remaining` se reporta como `0` en vez de un número negativo que indique un sobrepago.
- El campo `paid` sí se expone tal cual, pero en la UI de listado y dashboard, `remaining` es el campo que determina si una cuenta está "activa" o "terminada".
- La función `listCreditAccountSummaries` filtra por `remaining > 0` (active) y `remaining <= 0` (finished). Si `remaining` es forzado a `0`, una cuenta con sobrepago se marca como "terminada", ocultando el excedente.
- En la **importación de cartera**, `import_credit_portfolio_row()` no valida que la suma de pagos importados no exceda la deuda. Si el Excel tiene `accumulatedPayment > totalAmount`, el trigger de asignación (`least(v_remaining_to_allocate, v_installment.remaining_amount)`) dejará un sobrante sin asignar, pero el pago sí se inserta en `credit_payments`. Esto hace que `paid > total` en `calculateSummary`, y `Math.max(0, ...)` lo oculta.

### ¿Es un bug?
Es un **bug de datos encubierto**. La UI nunca muestra que hay un problema de contabilidad. Si un cliente pagó de más, el sistema lo reporta como "saldo cero", no como "sobrante a favor del cliente".

### Corrección segura propuesta
1. **Agregar campo `overpayment`** en `CreditAccountSummary`:
   ```typescript
   overpayment: Math.max(0, paid - total),
   remaining: Math.max(0, total - paid),
   ```
2. **No usar `remaining` como proxy de estado** en el frontend sin alertar si `overpayment > 0`.
3. **En la importación**, agregar validación: si `accumulatedPayment > totalAmount`, generar warning o rechazar la fila (depende de la política de negocio).
4. **En la base de datos**, considerar un `CHECK` o un trigger de alerta si `SUM(paid_amount) > total` para una cuenta, o al menos una vista de auditoría.

---

## 5. Entregables de go/no-go

### Riesgo real
| Riesgo | Probabilidad | Impacto |
|--------|--------------|---------|
| Trigger `is_active` automático corrompe métricas históricas del dashboard. | Alta | Alto |
| Trigger genera inconsistencia entre `get_credit_dashboard` y `get_credit_commercial_metrics` (uno filtra `is_active`, el otro no). | Alta | Alto |
| `calculateSummary` oculta sobrepagos de importación, generando cuadratura imposible. | Media | Alto |
| Importación de cuentas liquidadas desaparece inmediatamente del listado tras el trigger. | Media | Medio |

### Impacto
- **Dashboard**: Deja de ser fiable para métricas acumuladas si las cuentas terminadas se desactivan.
- **Reportes**: `control-mensual` y `commercial-metrics` divergen en su definición de "cuenta a considerar".
- **Importación**: UX degradada; cuentas importadas y pagadas desaparecen sin feedback.
- **Auditabilidad**: `Math.max(0, ...)` impide detectar sobrepagos en tiempo real.

### Diff exacto (propuesta de corrección, NO para aplicar ahora)

#### A) Unificar el uso de `is_active` en SQL
```sql
-- En get_credit_commercial_metrics(), agregar filtro consistente:
FROM credit_accounts ca
WHERE ca.is_active = true  -- <-- Agregar
LEFT JOIN credit_payments cp ON cp.credit_account_id = ca.id
```

#### B) Modificar `calculateSummary` para exponer sobrepagos
```typescript
function calculateSummary(account, installments): CreditAccountSummary {
  const total = Number(account.installment_amount) * account.installment_count;
  const paid = installments.reduce((sum, inst) => sum + Number(inst.paid_amount), 0);
  const remaining = total - paid;
  return {
    // ... campos existentes ...
    total,
    paid,
    remaining: Math.max(0, remaining),
    overpayment: remaining < 0 ? Math.abs(remaining) : 0,  // <-- Nuevo
    paymentCount: installments.filter((inst) => inst.status === 'PAID' || inst.status === 'PARTIAL').length,
  };
}
```

#### C) Trigger propuesto (si se decide implementar)
Si el negocio insiste en automatizar `is_active`, el trigger debe ser **idempotente y no destructivo**:
```sql
-- EJEMPLO CONCEPTUAL (NO APROBADO EN ESTA AUDITORÍA)
CREATE OR REPLACE FUNCTION update_credit_account_active_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo actualizar is_active si el estado real de cuotas cambió
  -- y NUNCA para cuentas históricas importadas sin consentimiento.
  -- Esto requiere un campo adicional 'auto_deactivate' o similar.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Plan de despliegue (si se aprueba la corrección)
1. **Paso 1**: Agregar columna `overpayment` o `has_overpayment` en la vista/respuesta (no en DDL de tabla si no es necesario).
2. **Paso 2**: Corregir `get_credit_commercial_metrics()` para filtrar `is_active = true` (o decidir explícitamente que NUNCA filtre y documentarlo).
3. **Paso 3**: Validar en `import_credit_portfolio_row()` que `accumulated_payment <= total_amount` (o al menos warning).
4. **Paso 4**: Si se decide el trigger, implementar en un feature branch con tests de integración sobre dashboard, reportes e importación.
5. **Paso 5**: Deploy a staging, ejecutar suite de importación de cartera de prueba, verificar que `get_credit_dashboard` y `get_credit_commercial_metrics` devuelven los mismos totales para un dataset conocido.
6. **Paso 6**: Deploy a producción en ventana de baja actividad.

### Plan de rollback
1. **Rollback inmediato**: Revertir el merge del branch del trigger.
2. **Rollback de datos**: Si el trigger ya corrió y modificó `is_active`, ejecutar backfill:
   ```sql
   UPDATE credit_accounts SET is_active = true;
   ```
   (Esto es seguro porque actualmente no hay cuentas inactivas legítimas).
3. **Rollback de `calculateSummary`**: Revertir el diff del servicio; la UI simplemente dejará de mostrar `overpayment` (degradación aceptable).
4. **Verificación post-rollback**: Correr `get_credit_clean_summary` y comparar con baseline antes del deploy.

---

## Conclusión de la auditoría

**NO se recomienda aplicar un trigger automático sobre `credit_accounts.is_active` en este momento** porque:
1. El dashboard y los reportes no están diseñados para soportar cuentas históricas inactivas.
2. Existe una inconsistencia crítica: `get_credit_commercial_metrics()` no filtra por `is_active`, mientras que `get_credit_dashboard()` sí lo hace.
3. `calculateSummary` oculta sobrepagos, lo que dificulta validar si el trigger se comportó correctamente tras una importación.

**Prerrequisitos para aprobar el trigger en el futuro:**
- Resolver la inconsistencia de filtrado entre `get_credit_dashboard` y `get_credit_commercial_metrics`.
- Agregar `overpayment` a `calculateSummary` y a la UI para detectar sobrepagos.
- Definir si `is_active` es un flag manual de negocio o un estado derivado de las cuotas (no ambos).
- Implementar tests de integración que comparen dashboard + reportes + listado antes y después de la desactivación automática.

**No se modificó código.** Esta auditoría es solo documento técnico para toma de decisiones.
