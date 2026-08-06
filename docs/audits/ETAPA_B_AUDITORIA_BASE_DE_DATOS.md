# Etapa B.1 — Auditoría y Hardening de Base de Datos (Informe revisado)

> **Alcance:** Auditoría técnica read-only de la base de datos Supabase (PostgreSQL 15) del proyecto `proyecto0-nextjs`.
> **Método:** Verificación sobre archivos (migraciones SQL, `schema.sql`, código de la app) + verificación posterior contra la base de datos real (`pg_get_functiondef`) + reconstrucción completa del flujo de creación de ventas.
> **Fecha:** 2026-08-04 (versión B original) → 2026-08-05 (revisión B.1).
> **Nota B.1:** La revisión corrige el hallazgo C1 (cuyo impacto real era distinto al reportado), actualiza la sección de hallazgos descartados, y documenta código muerto, hipótesis descartadas y hallazgos confirmados con evidencia de producción.
> **Inventario verificado:** 39 migraciones SQL (40 archivos con README), 23 tablas, 19 funciones/RPCs, 11 policies RLS de aplicación (4 catálogo/perfiles + 6 self-service + 1 storage).

---

## Resumen ejecutivo

| ID | Hallazgo | Riesgo | Estado | Confianza |
|----|----------|--------|--------|-----------|
| C1 | `create_checkout_sale` asigna valor de tipo `collection_status` a la columna `sale_status` → error de tipos en ejecución. **Rectificado:** la RPC existe y tiene el bug en producción, pero **ningún flujo vivo la invoca** (solo tests). Ver §2-R1 | ~~CRÍTICO~~ → **DESCARTADO como riesgo de producción** (deuda T18) | Rectificado | 100% |
| C2 | `schema.sql` no reconstruye la DB (sintaxis inválida + objetos faltantes) | CRÍTICO | Confirmado (archivos) | 100% |
| C3 | Trigger `handle_new_auth_user` existe solo en `schema.sql`, ausente en migraciones; la app no inserta `profiles` | CRÍTICO (reproducibilidad) | Confirmado (archivos) / prod pendiente | 100% archivos |
| C4 | `products.reference_price` y `products.tendencias` usados por la app, ausentes en todo el DDL | CRÍTICO (reproducibilidad) | Confirmado (archivos) / prod pendiente | 95% |
| C5 | Policy de storage `for all` sin `to role` en bucket público de adjuntos de proveedores | CRÍTICO (seguridad) | Confirmado (archivos) / prod pendiente | 100% archivos |
| C6 | `insert_and_validate_pago` (SECURITY DEFINER, sin chequeo de rol) con GRANT a `authenticated` | CRÍTICO (seguridad) | Confirmado (archivos) / prod pendiente | 100% archivos |
| C7 | Paginación de ventas con sort por `customerName` ordena solo la página (JS) | MEDIO | Confirmado | 95% |
| C8 | Import de cartera: `city` ← `between_streets` y `notes` ← `between_streets` (duplicado) | MEDIO | Confirmado | 100% |
| C9 | `getCreditAccountsPaginated` ignora opciones de paginación; filtra y pagina en memoria | ALTO | Confirmado | 100% |
| C10 | `get_credit_dashboard` v1 multiplicaba filas por join directo (histórico, reemplazado) | MEDIO | Confirmado (archivos) | 100% |
| C11 | `revalidateTag('admin-dashboard-analytics', 'default')` con 2 argumentos no invalida caché | BAJO | Confirmado | 100% |
| C12 | Import: match de cliente por `full_name ... limit 1` puede asignar a cliente duplicado | MEDIO | Probable | 90% |
| C13 | `importPortfolioRow` loguea el payload completo (PII) por consola | BAJO | Confirmado | 95% |

**Notas de calidad por área** (ver §13).

---

## 1. Hallazgos Confirmados (vigentes tras la revisión B.1)

> C1 fue **rectificado** y se movió a §2-R1. Los hallazgos C2–C13 conservan su validez; cada uno indica si la evidencia es de archivos, de código o pendiente de DB real.

### C2 — `schema.sql` no puede reconstruir la base (CRÍTICO) — **sin cambios**

**Evidencia (re-verificada en B.1):** `supabase/schema.sql` (1258 líneas).

**Qué ocurre:**
- Línea 1204: `alter table credit_installments enable row level security;` — la tabla no existe en el snapshot (todas las tablas `credit_*` están ausentes) → la restauración falla aquí.
- Líneas 1205-1206: mismo problema con `credit_account_items` y `credit_collection_notes`.
- Líneas 1208 y 1212 (y siguientes): `create policy if not exists ...` — sintaxis inválida en PostgreSQL 15.
- Objetos ausentes del snapshot: `credit_accounts`, `credit_installments`, `credit_payments`, `credit_payment_allocations`, `credit_collection_notes`, `credit_account_items`, `product_categories`, `proveedores` (5 tablas), `product_price_history`, la función/trigger `handle_new_auth_user`, y las columnas de soft-delete de `products` (`deleted_at`).

**Por qué ocurre:** `schema.sql` es un snapshot de Fase 1 con parches manuales aplicados después (secciones `20260728`, `20260729`, `20260803`), nunca regenerado.

**Impacto:** Cualquier intento de recrear la DB desde `schema.sql` falla o produce una DB incompleta (sin módulo de crédito, sin proveedores, sin alta de usuarios).

**Clasificación:** CRÍTICO (reproducibilidad/recuperación). **Estado:** Confirmado. **Confianza:** 100%. No requiere verificación de producción (el defecto está en el archivo mismo).

---

### C3 — Alta de usuarios depende de un objeto que no está en las migraciones (CRÍTICO) — **se mantiene, prod pendiente**

**Evidencia (re-verificada en B.1):** `handle_new_auth_user` + trigger `on_auth_user_created` solo existen en `schema.sql:625-647`. Grep en `supabase/migrations/**` → 0 coincidencias (la única mención es un comentario en `202608030001_restrict_profiles_self_update.sql:18`).

**Uso en la app:** El registro usa `supabase.auth.signUp` (`lib/authContext.tsx:92`); la sesión depende de leer el perfil con `getCurrentAuthProfile` (`lib/authContext.tsx:80`, `lib/auth/profileClient.ts:21`); grep de `profiles` en el código → usos SELECT, ninguno INSERT. No existe ninguna ruta `app/api/auth/*` (glob → no files found).

**Impacto:** En una DB reconstruida desde migraciones, `signUp` crea el usuario de auth pero ningún perfil; el login posterior falla (el flujo considera "Cuenta desactivada"). La creación de perfiles depende enteramente de un trigger que solo está en el snapshot manual.

**Clasificación:** CRÍTICO (reproducibilidad). **Estado:** Confirmado (archivos). **Confianza:** 100% archivos. **Pendiente de DB real:** no se obtuvo en B.1 evidencia de producción (ver §10.3); el estado real de prod (trigger creado a mano o no) no fue verificado con consulta.

> **Resolución (W07):** la función `handle_new_auth_user()` + trigger `on_auth_user_created` quedaron incorporados a las migraciones en `supabase/migrations/202608060001_handle_new_auth_user.sql` (función idéntica a la definición histórica, `SECURITY DEFINER`, trigger drop-if-exists + create, backfill idempotente con anti-join + `on conflict do nothing`). Un proyecto reconstruido solo con migraciones ya crea `profiles` automáticamente en `signUp`. Falta verificación manual en DB real del backfill de huérfanos existentes en producción.

---

### C4 — Columnas `reference_price` y `tendencias` de `products` fuera del DDL (CRÍTICO) — **se mantiene, prod pendiente**

**Evidencia (re-verificada en B.1):** La tabla `products` definida en `202605260002:13-33` no incluye `reference_price` ni `tendencias`. Grep en `supabase/**` de ambas → 0 coincidencias. La app las usa en:
- `lib/repositories/productRepository.ts` (SELECT/INSERT/UPDATE: 26, 69, 73, 99, 103, 286, 290, 337, 341).
- `lib/adapters/catalogAdapter.ts` (24, 28, 76, 202, 204, 229, 236).
- `lib/types.ts:16` y `lib/services/catalogService.ts:108-127` (`product.tendencias`, `product.destacado`).
- `lib/services/admin/catalog.ts:79,146` (`payload.tendencias` en create/update).

**Por qué ocurre:** Columnas agregadas manualmente en producción (drift) o creadas fuera de control de versiones; las migraciones no reflejan el esquema real.

**Impacto:** En cualquier DB construida desde migraciones, `listProducts`, `createProduct` y `updateProduct` fallan en runtime (columna inexistente). El estado de producción no es verificable sin acceso (ver §10.2).

**Clasificación:** CRÍTICO (reproducibilidad). **Estado:** Confirmado (en archivos). **Confianza:** 95%. **Depende de verificar producción** (`\d products`): no se obtuvo evidencia de DB real en B.1.

> **Resolución (W08):** las columnas son necesarias (callers vivos en catálogo admin, secciones de Tendencias del home y el importador de URLs). Se incorporaron al DDL oficial con la migración `supabase/migrations/202608060002_products_reference_price_tendencias.sql` (`reference_price numeric(12,2)` nullable y `tendencias boolean not null default false`, con `add column if not exists` para ser segura sobre una base donde ya existan). El snapshot regenerado (`npm run schema:generate`) y los tipos del código quedan alineados. Falta verificación manual en DB real.

---

### C5 — Policy de storage pública sin restricción de rol (CRÍTICO, seguridad) — **se mantiene, prod pendiente**

**Evidencia (re-verificada en B.1):** `supabase/migrations/202607230002_create_proveedor_adjuntos_bucket.sql:1-10`.

**Qué ocurre:**
- Línea 3: bucket `proveedor-adjuntos` creado con `public = true`.
- Líneas 7-10: `create policy "Admin full access to proveedor-adjuntos" on storage.objects for all using (bucket_id = 'proveedor-adjuntos') with check (bucket_id = 'proveedor-adjuntos')` — **sin cláusula `to role`**.
- Corrección de nomenclatura B.1: la policy real se llama `"Admin full access to proveedor-adjuntos"` (la versión B la mencionaba como `proveedor_adjuntos_public_access`; el nombre no cambia el fondo del hallazgo).

**Impacto:** En RLS, una policy sin `to role` se aplica a **todas** las roles, incluida `anon`. Cualquier visitante puede insertar/actualizar/eliminar objetos en el bucket de adjuntos de proveedores (facturas/documentos sensibles), y los objetos son públicos por URL.

**Clasificación:** CRÍTICO. **Estado:** Confirmado (archivos). **Confianza:** 100% (semántica SQL). **Pendiente de DB real** (`pg_policies`, §10.5): no se obtuvo evidencia de producción en B.1.

---

### C6 — `insert_and_validate_pago` ejecutable por cualquier usuario autenticado (CRÍTICO, seguridad) — **se mantiene, prod pendiente**

**Evidencia (re-verificada en B.1):** `supabase/migrations/202607250001_proveedor_pago_rpc.sql:1-62`.

**Qué ocurre:** La función es `security definer` (línea 10) y su cuerpo no verifica el rol de quien la invoca. Las líneas 61-62 hacen:
```sql
GRANT EXECUTE ON FUNCTION insert_and_validate_pago TO service_role;
GRANT EXECUTE ON FUNCTION insert_and_validate_pago TO authenticated;
```

**Impacto:** Todo usuario registrado (rol `authenticated`) puede registrar pagos de proveedores, saltándose cualquier control de autorización aplicativo. El caller `lib/services/admin/pagos.service.ts` no compensa esto a nivel de BD (solo a nivel de UI).

**Clasificación:** CRÍTICO. **Estado:** Confirmado (archivos). **Confianza:** 100% (archivos). **Pendiente de DB real** (`information_schema.role_routine_grants`, §10.6): no se obtuvo evidencia de producción en B.1.

---

### C7 — Paginación de ventas rota con sort por `customerName` (MEDIO) — **sin cambios**

**Evidencia (re-verificada en B.1):** `lib/repositories/saleRepository.ts:484-540`.

**Qué ocurre:** La query SQL ordena por `sale_date` (default de `getSaleOrderColumn`, línea 318) y aplica `range(start, end)` (línea 519). Después, en Node, se ordena por `customerName` **solo la página obtenida** (529-534).

**Impacto:** Al paginar con orden "customer", las páginas 2+ devuelven registros incorrectos/duplicados (el orden estable no corresponde al SQL). El orden por nombre nunca es global.

**Clasificación:** MEDIO. **Estado:** Confirmado. **Confianza:** 95%.

---

### C8 — Import de cartera: `between_streets` duplicado en `city` y `notes` (MEDIO, calidad de datos) — **sin cambios**

**Evidencia (re-verificada en B.1):** `supabase/migrations/202606190001_fix_import_overpayment_tolerance.sql:40-48` (v4 vigente). En el insert del cliente nuevo, `city` ← `between_streets` (línea 46) y `notes` ← `between_streets` (línea 47). El payload lo envía `lib/repositories/creditAccountRepository.ts:504` (`between_streets: row.betweenStreets`). La misma duplicación existe en la v3 (`202606080001_fix_credit_origin_period.sql:57-68`).

**Impacto:** Clientes importados quedan con ciudad incorrecta y nota duplicada/inservible. Afecta reportes y datos maestros.

**Clasificación:** MEDIO. **Estado:** Confirmado. **Confianza:** 100%.

---

### C9 — `getCreditAccountsPaginated` ignora la paginación (ALTO, performance) — **sin cambios**

**Evidencia (re-verificada en B.1):**
- `lib/repositories/creditAccountRepository.ts:157-180`: `_options` (page/pageSize/statusFilter/search) recibido pero **no usado**; consulta todas las cuentas `.eq('is_active', true)` sin límite + todas las instalaciones vía `batchedInQuery`.
- `lib/services/creditAccountService.ts:301-335`: filtros `search`, `statusFilter`, `filterMonth/Year`, `filterPaymentStatus` y `slice((page-1)*pageSize, page*pageSize)` en memoria.
- `app/api/admin/credit-accounts/route.ts:34`: `pageSize = Math.min(100000, ...)` (sin límite práctico).

**Impacto:** Uso de memoria, CPU y latencia proporcionales al total de cuentas; en volumen real degrada el panel admin de crédito.

**Clasificación:** ALTO. **Estado:** Confirmado. **Confianza:** 100%.

---

### C10 — `get_credit_dashboard` v1 multiplicaba filas (MEDIO, histórico) — **sin cambios**

**Evidencia:** `202606010002_credit_dashboard.sql:54-84` — join directo a `credit_payments cp` sin agregación previa por cuenta; `sum(cp.amount)` inflado por filas de instalaciones. Reemplazado por v2 en `202606020001_credit_portfolio_update.sql:15-90` que agrupa por cuenta y es correcta (usa `account_totals`, `generate_series` para 12 meses).

**Impacto:** Solo relevante si la DB real quedó con v1 (ver §10.4). En archivos, el bug existió y fue corregido.

**Clasificación:** MEDIO (histórico). **Estado:** Confirmado (en archivos). **Confianza:** 100%.

---

### C11 — `revalidateTag` con dos argumentos no invalida nada (BAJO, Etapa C) — **sin cambios**

**Evidencia (re-verificada en B.1):** `lib/services/admin/maintenance.ts:603-608` — `revalidateTag('admin-dashboard-analytics', 'default')` (línea 605).

**Qué ocurre:** El segundo argumento hace que la firma no coincida con el tag usado en `app/api/admin/dashboard/analytics/route.ts` → el caché de 60s nunca se invalida vía `cache_clear`.

**Impacto:** El dashboard admin puede mostrar datos de hasta 60s de antigüedad tras limpiar caché.

**Clasificación:** BAJO. **Estado:** Confirmado. **Confianza:** 100%.

---

### C12 — Match de cliente por `full_name ... limit 1` (PROBABLE) — **sin cambios**

**Evidencia (re-verificada en B.1):** `202606190001:35-37` (y lógica idéntica en v2/v3): `select id into v_customer_id from customers where full_name = v_full_name limit 1;`. El índice único parcial `uq_customers_phone_partial` protege el teléfono, pero no hay restricción de unicidad sobre `full_name`.

**Impacto:** Con clientes homónimos, el import asigna el crédito al primero arbitrario (sin garantía de que sea el correcto) en lugar de fallar o pedir decisión.

**Clasificación:** MEDIO. **Estado:** Probable (depende de que existan duplicados). **Confianza:** 90%.

---

### C13 — Logging de payload con PII (BAJO, privacidad) — **sin cambios**

**Evidencia (re-verificada en B.1):** `lib/repositories/creditAccountRepository.ts:486` (`console.error('RPC input:', JSON.stringify(row, null, 2))`) y `515-518` (`console.log('RPC payload:', JSON.stringify(payload, null, 2))`) — payload completo del import (nombres, teléfonos, direcciones) a logs del servidor.

**Impacto:** Exposición de datos personales en logs; riesgo en entornos con agregación de logs.

**Clasificación:** BAJO. **Estado:** Confirmado. **Confianza:** 95%.

---

## 2. Hallazgos rectificados

> Cambios documentados respecto a la versión B, todos con evidencia comprobada.

### R1 — C1 `create_checkout_sale`: existe, tiene bug, pero **no participa del flujo actual** (DESCARTADO como riesgo de producción)

**Hallazgo anterior (versión B):** "`create_checkout_sale` asigna valor de tipo `collection_status` a la columna `sale_status` → error de tipos en ejecución. CRÍTICO. Confirmado (en archivos), 95%." La auditoría afirmaba además: "Toda la creación de ventas pasa por `create_checkout_sale`" y "el sistema de ventas es un punto único de falla".

**Resultado:** Parcialmente correcto / impacto mal clasificado.

- **El bug es real y está en producción:** `select pg_get_functiondef('create_checkout_sale'::regproc)` (Supabase SQL Editor, 2026-08-05) devuelve un cuerpo **byte-idéntico** a `supabase/migrations/202605260005_rpcs.sql:284-569`. El `insert into sales` conserva el `case` en posición 3 (`when ... then 'UP_TO_DATE'::collection_status else 'PENDING'::collection_status end`) alimentando la columna `sale_status` (enum `sale_status` = PENDING/CONFIRMED/DELIVERED/CANCELLED según `202605260001_enums.sql:5`; no incluye `UP_TO_DATE`). La primera ejecución de la RPC falla con `column "sale_status" is of type sale_status but expression is of type collection_status`. La columna `collection_status` (posición 9) recibe `'PENDING'` crudo.
- **Pero ningún flujo vivo la invoca.** Reconstrucción completa del flujo de compra (evidencia en §6):
  1. Botón del checkout: `components/Cart/CartSummary.tsx:89` ("Continuar compra") → `app/checkout/page.tsx:44,55` `handleWhatsApp`.
  2. `app/checkout/page.tsx:55` llama a `persistPreSale` (`lib/services/preSaleClient.ts:18`), que hace `POST /api/pre-sales`.
  3. `app/api/pre-sales/route.ts:67,80,105` inserta directamente en `sales`, `sale_items` e `installments` (vía `saleRepository.createSale`/`createSaleItems` + insert de cuotas) — **no pasa por la RPC**.
  4. El único código de la app que llama a la RPC es `lib/repositories/saleRepository.ts:326` (`createCheckoutSaleTransaction`), alcanzado solo por `lib/services/checkoutSaleService.ts:47` ← `app/api/sales/route.ts:24` ← `lib/services/checkoutSaleClient.ts:7` (`fetch('/api/sales')`). **`persistCheckoutSaleFromClient` no tiene ningún importador.**
  5. Los únicos invocadores reales de la RPC en todo el repo son tests: `tests/db/checkout-real.test.mjs` (líneas 40, 71, 84, 97, 119) y `tests/helpers/seedFinancialFixtures.mjs:77`.

**Por qué se malclasificó:** la auditoría B no reconstruyó el flujo de la UI; asumió por documentación (`docs/guides/SUPABASE_PHASE_1.md`) que el checkout usaba el RPC.

**Nuevo estado:** **DESCARTADO como riesgo de producción** (no rompe el sistema hoy). Se documenta como **bug real sobre código muerto** → deuda técnica T18 (§8). La hipótesis de "drift / parche manual en prod" también queda descartada (§4-H1).

**Prueba de que el bug no afecta el runtime:** el flujo vivo (`/api/pre-sales`) usa `createSale` con `SaleInsert` (`lib/supabase/types/ventas.ts:10-28`), que **no incluye** `collection_status` (usa el default de columna `'PENDING'`) e inserta `sale_status: 'PENDING'` correctamente tipado. El `case` roto de la RPC nunca se ejecuta en ese camino.

---

## 3. Hallazgos confirmados con evidencia de producción

> Solo los hallazgos confirmados mediante consultas a la base de datos real (SQL Editor / `pg_get_functiondef` / inspección de la DB), **no** por lectura de migraciones.

| Hallazgo | Consulta de producción | Resultado |
|----------|------------------------|-----------|
| C1 — estado de `create_checkout_sale` en prod | `select pg_get_functiondef('create_checkout_sale'::regproc)` (2026-08-05) | La función **existe** en prod y su definición es **byte-idéntica** a `202605260005_rpcs.sql:284-569` (firma, `LANGUAGE plpgsql`, `SECURITY DEFINER`, `SET search_path TO 'public'`, cuerpo completo). El bug de tipos (positional mismatch del `case` `::collection_status` sobre `sale_status`) **está presente en prod**. Confirma a su vez: sin drift, sin parche manual (ver §4-H1). |

> **Nota de alcance B.1:** es el único objeto verificado contra la DB real hasta la fecha. El resto de hallazgos sigue dependiendo de verificaciones pendientes listadas en §10. No se ejecutó ninguna otra consulta de producción.

---

## 4. Hipótesis descartadas

> Todo lo que la auditoría original sospechaba y luego quedó descartado por evidencia.

| Hipótesis (versión B) | Veredicto | Evidencia |
|-----------------------|-----------|-----------|
| H1 — "La DB real fue parcheada a mano (drift) o los tests no se ejecutan contra el código vigente" (C1, §6.1) | **Descartada la primera rama:** no hay drift. `pg_get_functiondef` = migración exacta, bug incluido. | Consulta de producción §3. Consecuencia: los tests que invocan la RPC (`tests/db/checkout-real.test.mjs`) apuntan a una función rota que ningún flujo usa; o no se corren contra prod, o correrían fallando. |
| H2 — "El checkout web usa `create_checkout_sale`" | **Falsa.** El checkout usa `/api/pre-sales` (INSERT directo). | Reconstrucción de flujo (§2-R1 y §6): `app/checkout/page.tsx:55` → `preSaleClient.ts:18` → `/api/pre-sales`. |
| H3 — "`create_checkout_sale` es punto único de falla del sistema de ventas" (R6 en versión B) | **Falsa.** La creación de ventas no depende de la RPC. | Ídem §2-R1. |
| H4 — "C1 rompe el sistema hoy" | **Falsa.** C1 rompe solo código que no se ejecuta en runtime (solo tests). | Ídem §2-R1. |
| H5 — "`lib/products.ts` es la fuente del catálogo en la UI" | **Falsa (ya descartada en B).** Se mantiene: `lib/products.ts` no se importa en ningún archivo de código (grep → solo referencias en `docs/**`). | `app/page.tsx`, `app/categoria/[...]` y `checkoutSaleService.ts` usan `catalogService` (Supabase). |

---

## 5. Código muerto identificado

> Código que no participa del runtime, con evidencia de callers. Únicamente se listan piezas con cadena de invocación nula (o solo desde tests).

| Pieza | Evidencia de que está muerta | Uso vivo alternativo |
|-------|------------------------------|----------------------|
| `lib/services/checkoutSaleClient.ts` (`persistCheckoutSaleFromClient`) | Única referencia es su propia definición; 0 importadores en todo el repo (grep). | `preSaleClient.ts` es el caller real del checkout. |
| `app/api/sales/route.ts` (POST) | Único `fetch('/api/sales')` está en `checkoutSaleClient.ts` (sin callers). | `/api/pre-sales` es la vía real de escritura. |
| `lib/services/checkoutSaleService.ts` (`persistCheckoutSale`) | Solo lo importa `app/api/sales/route.ts` (muerto). | — |
| `lib/repositories/saleRepository.ts:321-342` `createCheckoutSaleTransaction` | Solo lo importa `checkoutSaleService.ts` (muerto). | — |
| `lib/validation/ventas.ts` `isValidCheckoutSaleInput` / `assertValidCheckoutInput` | Solo usados por `/api/sales/route.ts:20` y `checkoutSaleService.ts:20` (muertos). Nota: `normalizeSaleStatus`/`normalizeCollectionStatus` del mismo archivo sí se usan en admin (`lib/services/admin/sales.ts:16`). | — |
| Tipos `CheckoutSaleInput`, `CheckoutSaleRpcInput`, `CheckoutSaleRpcItem`, `CheckoutSaleResult`, `CheckoutSaleRpcRow`, `CheckoutSaleItemInput` (`lib/supabase/types/ventas.ts:50-109`) | Solo referenciados por los módulos muertos anteriores. | `SaleInsert`/`SaleRow`/`SaleItemInsert` sí se usan (pre-sales). |
| RPC `create_checkout_sale` | En prod es byte-idéntica a la migración; la única invocación en el repo es desde tests. | El flujo vivo inserta con `createSale` + `createSaleItems`. |
| `tests/db/checkout-real.test.mjs` | Prueba una RPC sin uso en runtime y con bug en prod → no ejecutable contra prod tal cual (o no se ejecuta). | Tests unitarios de lógica pura (`tests/integration/*.test.mjs`) validan solo texto de migraciones. |
| `docs/guides/SUPABASE_PHASE_1.md` | Documenta checkout vía RPC como si fuera el flujo activo → documentación desactualizada (no es código). | — |

> Nota: `findSaleByCheckoutRequestId` (`saleRepository.ts:346-361`) **no** se listó como muerto: lo usa `createSale` (línea 375) en el recovery 23505 del camino vivo de pre-sales.

---

## 6. Flujo real de creación de ventas (reconstrucción completa, evidencia B.1)

```
Frontend
  components/Cart/CartSummary.tsx:89   botón "Continuar compra" → onClick={onWhatsApp}
    app/checkout/page.tsx:44            handleWhatsApp
      app/checkout/page.tsx:55          persistPreSale(name, phone, address, location, items)
        lib/services/preSaleClient.ts:18   fetch('/api/pre-sales', POST)   ← cliente sin auth
          app/api/pre-sales/route.ts:36    findOrCreateCustomer (customerRepository)
          app/api/pre-sales/route.ts:67    createSale(supabase, saleInput)      → .from('sales').insert(...)
          app/api/pre-sales/route.ts:80    createSaleItems(supabase, items)    → .from('sale_items').insert(...)
          app/api/pre-sales/route.ts:105   .from('installments').insert(rows)  → cuotas
      app/checkout/page.tsx:87          window.open(wa.me/...)  → handoff WhatsApp
```

**Camino RPC (muerto):**
```
checkoutSaleClient.ts:7 fetch('/api/sales')  →  app/api/sales/route.ts:24 persistCheckoutSale  →
checkoutSaleService.ts:47 createCheckoutSaleTransaction  →  saleRepository.ts:326 .rpc('create_checkout_sale')  →  sales
```

**Camino de pagos (no crea ventas):** `app/api/admin/sales/[id]/payments/route.ts` → `paymentService.registerAdminPayment` → `paymentRepository.ts:21 .rpc('register_sale_payment')`.

**Clasificación de flujos:**

| Flujo | Estado |
|-------|--------|
| Checkout web ("Continuar compra") | ✅ Activo — vía `/api/pre-sales` (INSERT directo) |
| Checkout admin | ❌ No existe (admin solo lista/edita/registra pagos) |
| Ventas manuales | ❌ No existe |
| Importaciones | ⚠ Crea `credit_accounts`, no ventas |
| Recuperación / ready | ⚠ Solo readiness, no crea ventas |
| Pruebas | ⚠ `npm run test:db` invoca la RPC (rota en prod) |

---

## 7. Riesgos Arquitectónicos

### R1 — RLS "todo o nada" + anon key en el cliente (MEDIO/ALTO)
Solo 11 policies en archivos; la seguridad efectiva de ventas/crédito depende de que cada RPC `security definer` valide bien y de que la anon key no se filtre. La ruta `app/api/mi-cuenta/resumen/route.ts` usa el cliente con anon key y se apoya en RLS self-service. Un error de configuración (como C5/C6) amplifica el riesgo a todo el dataset. **Arquitectura frágil:** autorización repartida entre RPCs, policies y capa aplicativa sin una barrera central.

### R2 — Doble fuente de verdad del catálogo (histórico)
`lib/products.ts` (hardcodeado) fue la fuente original; hoy el storefront lee solo de Supabase. El archivo hardcodeado quedó sin uso (deuda T, §8). Además no hay migración/seed que documente cómo se cargó el catálogo en `products` → origen del contenido desconocido.

### R3 — Agregación y paginación en Node
Varios repositorios traen el dataset completo y filtran/paginan en JS (`getCreditAccountsPaginated`, cobranza, resumen de clientes con deuda). Sin límite real de `pageSize` (hasta 100000). El costo crece con el volumen total, no con la página.

### R4 — RPCs `security definer` con defaults amplios
Casi todos los RPCs de crédito son `security definer`. La mayoría usa RLS admin/staff correctamente, pero la autorización es per-RPC (C6 es el extremo). No hay capa central de autorización.

### R5 — Doble estado de cuentas de crédito
`credit_accounts.is_active` es flag manual de visibilidad, mientras el estado financiero (paid/pending/overdue) se deriva de `credit_installments.remaining_amount`. Los dos pueden contradecirse: una cuenta morosa con `is_active=false` desaparece de cobranza y control mensual sin que su deuda cambie. Diseño frágil para operaciones.

### R6 — (RECTIFICADO) El flujo real de creación de ventas es `/api/pre-sales` (INSERT directo)
La versión B afirmaba: "Toda la creación de ventas pasa por `create_checkout_sale`... punto único de falla". **Incorrecto.** El flujo vivo es `POST /api/pre-sales` → `createSale`/`createSaleItems`/insert de cuotas (service-role). Implicancias nuevas:
- El endpoint **no autentica** (sin `requireAdminUser`/`requireAuth`; ya señalado como S3 en `AUDITORIA_TECNICA_PRE_PRODUCCION.md`), escribe con service-role y **no valida** catálogo, precios ni stock: el total se calcula con precio/cantidad enviados por el cliente, las cuotas con `installmentCount` del cliente (`pre-sales/route.ts:43-47,60`), y **no descuenta stock** (a diferencia de la RPC que sí lo hacía, §12).
- No hay control de modo mantenimiento (`app/api/sales/route.ts:14` sí lo tiene; `/api/pre-sales` no).
- No hay idempotencia real: `checkout_request_id` se genera con `crypto.randomUUID()` en cada POST (`pre-sales/route.ts:45`), por lo que reintentos generan ventas duplicadas. El recovery 23505 de `createSale` solo aplica ante colisión accidental.

**Clasificación:** ALTO (seguridad/operación), evidencia de código.

### R7 — RPCs `security definer` con defaults amplios (renumerado; ver R4 arriba)
*(se consolidó en R4)*

---

## 8. Deuda Técnica

- **T1 — Índices duplicados por UNIQUE** (`202605260003_indexes.sql`): `idx_categories_slug`, `idx_products_legacy_product_id`, `idx_products_slug`, `idx_customers_dni`, `idx_customers_email`, `idx_sales_sale_number`, `idx_sales_checkout_request_id`, `idx_installments_sale_id` — todos prefijos izquierdos de constraints UNIQUE. Carga de escritura innecesaria.
- **T2 — Índices btree inservibles para búsquedas**: `idx_customers_full_name`, `idx_customers_phone`, `idx_customers_address`, `idx_credit_accounts_product_name`, `idx_customers_notes` (btree; nunca matchean `ILIKE '%...%'`). Los GIN trgm de `202607280001` son los efectivos → los btree son redundantes.
- **T3 — RPCs muertos**: `apply_credit_payment` nunca dropeado.
- **T4 — `validate_runtime_contract` desactualizado**: valida 10 tablas/11 columnas/4 funciones/2 extensiones; no cubre crédito ni proveedores → falso verde (MEDIO).
- **T5 — `schema.sql` como snapshot con parches manuales** (ver C2) — debería regenerarse o eliminarse.
- **T6 — `products.archived_at` huérfana**: ninguna query la usa.
- **T7 — `sale_items.product_id` FK sin uso real** en las queries de detalle.
- **T8 — Precisión inconsistente**: `product_price_history` usa `numeric(10,2)` vs `products.price` `numeric(12,2)`.
- **T9 — `payment_method` como texto libre** (vocabulario no controlado) vs enums tipados en el resto del esquema.
- **T10 — Inconsistencia de modelado**: `credit_installments.status` es TEXT con CHECK, mientras `sale_status`/`collection_status` son enums.
- **T11 — `admin_audit_logs` sin política de retención**.
- **T12 — Sobre-pago tolerado sin registro**: el import no asigna ni registra el excedente (C8/T, `202606190001`).
- **T13 — Logging de PII** (C13).
- **T14 — Carga completa en memoria**: `getCustomersWithDebt`, `getCollectionSummary`, resumen de mi-cuenta sin paginación.
- **T15 — README de migraciones documenta solo ~7 de 39**.
- **T16 — `mainCustomer = customers[0]` sin orden** en `mi-cuenta/resumen` (arbitrario con multi-customer).
- **T17 — `enable_signup = true` en `supabase/config.toml`** (entorno local).
- **T18 — (NUEVO B.1) Cadena de checkout RPC abandonada**: `create_checkout_sale` (con bug real en prod), `checkoutSaleClient.ts`, `checkoutSaleService.ts`, `app/api/sales/route.ts`, `createCheckoutSaleTransaction`, validaciones `isValidCheckoutSaleInput`/`assertValidCheckoutInput` y tipos `CheckoutSale*` forman una funcionalidad sin callers (solo tests). El RPC no debería "corregirse" sin decidir antes si se vuelve a usar (ver §14, próximas etapas).
- **T19 — (NUEVO B.1) `/api/pre-sales` sin auth, sin validación de catálogo/stock ni control de mantenimiento** (R6): es el único camino de creación de ventas y carece de las protecciones que sí tenía el camino RPC abandonado.
- **T20 — (NUEVO B.1) Tests de DB apuntan a funcionalidad abandonada**: `tests/db/checkout-real.test.mjs` y `seedFinancialFixtures.mjs` dependen de una RPC rota en prod y sin uso en runtime → suite `test:db` no ejecutable contra prod en su estado actual (o ejercita un camino que la app ya no usa).

---

## 9. Inconsistencias de documentación

- `docs/audits/AUDITORIA_TECNICA_PRE_PRODUCCION.md`: "31 migraciones" → reales **39**. "23 tablas" ✅, "19 RPCs" ✅, columnas fantasma ✅ (con matiz C4), fallo `schema.sql:1204` ✅, `revalidateTag` de 2 args ✅.
- `AGENTS.md`: "Product catalog is hardcoded in `lib/products.ts`" → **desactualizado**; el storefront lee de Supabase y `lib/products.ts` no se importa.
- `docs/guides/SUPABASE_PHASE_1.md`: **desactualizado (NUEVO B.1)** — documenta el checkout persistiendo vía `create_checkout_sale` (RPC) como el flujo vigente; el flujo real es `/api/pre-sales` (INSERT directo). Ver §2-R1.
- `README` de migraciones: cobertura parcial (T15).
- `202606080001` anuncia en su cabecera "Revoke public execution" — **pendiente de verificar en DB real** si el REVOKE se aplicó realmente (no hay sentencia visible en el archivo).
- `validate_runtime_contract`: su contrato promete más cobertura de la que valida (T4).

---

## 10. Verificaciones pendientes contra la DB real

> Resuelto en B.1: el punto 1 (estado de `create_checkout_sale` en prod) quedó **cerrado** con evidencia de producción (§3). El resto sigue pendiente; no se ejecutaron consultas de producción adicionales.

1. ~~Estado de `create_checkout_sale` en prod (C1)~~ → **RESUELTO (B.1)**: `pg_get_functiondef` confirma existencia, byte-idéntica a la migración y bug presente. Sin drift. (Antes: "si los tests pasan, el RPC fue parcheado" → no aplica: la RPC no se usa en runtime.)
2. **Existencia de `products.reference_price` / `products.tendencias` (C4).** `\d products` en prod.
3. **Existencia de `handle_new_auth_user` y su trigger (C3).** `\df handle_new_auth_user` y `\d auth.users` (triggers).
4. **Versión de `get_credit_dashboard` desplegada (C10).** `\df+ get_credit_dashboard` para ver si es v1 (bug) o v2 (correcta).
5. **Policy de storage vigente (C5).** `select * from pg_policies where schemaname='storage';` y estado de `public` del bucket.
6. **Grants reales de `insert_and_validate_pago` (C6).** `select * from information_schema.role_routine_grants where routine_name='insert_and_validate_pago';`.
7. **Política `profiles` de update de `202605260004`** si sigue vigente pese al GRANT column-level de `202608030001`.
8. **Constraint `uq_credit_accounts_operation_number` aplicado y datos duplicados previos** (`202606160001`): `select operation_number, count(*) from credit_accounts group by 1 having count(*) > 1;`.
9. **Versión de import desplegada** (v3 vs v4) — el bug `between_streets` (C8) existe en ambas.
10. **Volumen real de datos** (nº de sales, credit_accounts, installments) para cuantificar C9/T14.
11. **Índices realmente usados** (`pg_stat_user_indexes`) para priorizar T1/T2.
12. **Drift general**: comparar `information_schema.columns`/`pg_proc` de prod contra las migraciones (cubre también posibles fixes manuales de C5/C6).

---

## 11. Lista de mejoras futuras (solo análisis; NO implementar en esta etapa)

> El usuario pidió explícitamente no proponer fixes ahora. Estas son observaciones para priorizar en una etapa posterior.

- Llevar la paginación/filtrado de crédito a SQL (offset/keyset) y acotar `pageSize`.
- Centralizar autorización de RPCs `security definer` (verificación de rol explícita en el cuerpo, no solo GRANT).
- Quitar/restaurar las policies de storage y los grants ampliados.
- Revisar el pipeline de reconstrucción: regenerar o eliminar `schema.sql`; asegurar `handle_new_auth_user` en migraciones.
- Estandarizar numeración y documentación de migraciones (README completo).
- Consolidar el catálogo (eliminar `lib/products.ts`) y documentar la carga inicial de `products`.
- Retención y purga de `admin_audit_logs`; no loguear payloads con PII.
- Depurar índices (T1/T2) y función muerta (T3) tras medir con `pg_stat_user_indexes`.
- Unificar vocabulario de `payment_method` y modelo de `status`.
- Decidir la semántica de `is_active` vs estado financiero.

---

## 12. Qué NO tocar (diseño correcto que no debe "arreglarse")

> Actualizado en B.1: el punto de idempotencia de checkout ahora referencia el camino vivo.

- **`register_credit_payment`** (`202606080001:314-403`): valida monto > 0 y contra `SUM(remaining_amount)`, inserta payment, asigna FIFO con `FOR UPDATE`, verifica asignación completa; errores tipados (`PAYMENT_INVALID_AMOUNT`, `PAYMENT_EXCEEDS_DEBT`). Único matiz: TOCTOU teórico entre validación y lock (no accionable sin DB).
- **`generate_credit_installments`** (`202606010003:81-125`): matemática de truncamiento para cuotas exactas.
- **CHECKs de integridad de cuotas**: `paid_amount + remaining_amount = original_amount` en ambas tablas; `UNIQUE (credit_account_id, installment_number)`; CHECKs de status.
- **RLS default-deny** en tablas transaccionales y **solo lectura pública** en catálogo (`202605260004`).
- **Policies admin/staff** de crédito vía subquery a `profiles.role`.
- **Policies self-service** para `mi-cuenta` (`202607280001`: customers, credit_accounts, credit_installments, credit_payments, credit_account_items, credit_collection_notes).
- **GRANT column-level en `profiles`** (`202608030001`) — endurecimiento correcto.
- **GIN trgm** para búsquedas de clientes/crediticias (`202607280001`).
- **`findOrCreateCustomer`** con retry 23505 (phone/email únicos).
- **Recovery 23505 en `createSale`** por `checkout_request_id` (`saleRepository.ts:363-382`) — es el camino vivo (pre-sales). Nota B.1: la idempotencia *dentro del RPC* (`create_checkout_sale`) es código muerto (T18).
- **CHECKs money >= 0** y **normalización de inputs** (trim, email en minúsculas).
- **`payments.payment_request_id` UNIQUE parcial** e índice asociado.
- **FK restrictiva `sales.customer_id`** (sin ventas huérfanas).
- **`BATCH_SIZE = 200`** en queries batched (evita límites de tamaño de query).

---

## 13. Notas de calidad por área (1-10)

| Área | Nota | Justificación |
|------|------|---------------|
| Arquitectura | 7 | Separación clara repo/service/route y path alias coherente; pero autorización repartida (R1) y doble estado de crédito (R5). B.1: la cadena RPC abandonada (T18) convive con la vía activa sin auth (R6). |
| Seguridad | 5 | RLS bien diseñada en su mayoría y GRANT column-level; penalizada por C5, C6 y el falso verde del contrato (T4). B.1: se agrega R6 (endpoint de ventas sin auth con service-role). |
| Rendimiento | 5 | Índices y consultas clave bien planteados; C9/C10/T14 (carga completa + agregación en Node) lo degradan. |
| Escalabilidad | 4 | Sin paginación real en crédito y sin límite de `pageSize`; no escala con volumen. |
| Backend (Next.js/services) | 7 | Idempotencia, retries y manejo de errores cuidados; C7 (sort en página) y C11 (revalidate) son errores puntuales. B.1: el camino vivo de ventas carece de validación/stock (R6). |
| Frontend | 8 | Rutas, estados y accesibilidad consistentes; catálogo y admin cohesionados. |
| Base de datos | 6 | Modelo 3NF razonable y RLS pensada; C3/C4 (drift y objetos faltantes), C2 y T1/T2 la penalizan. B.1: C1 ya no penaliza el runtime (deuda T18). |
| UX | 8 | Flujos de checkout/crédito/cobranza completos y consistentes. |
| Mantenibilidad | 5 | 39 migraciones con README parcial, `schema.sql` inservible, funciones muertas y dualidad de fuentes (T5/T15/T3/T2). B.1: +T18 (cadena abandonada) y +T20 (tests de funcionalidad abandonada). |

---

## Resumen ejecutivo final (revisión B.1)

### Hallazgos confirmados (vigentes)
- **C2** (`schema.sql` inservible, CRÍTICO), **C3** (alta de usuarios sin trigger en migraciones, CRÍTICO), **C4** (columnas `products` fuera del DDL, CRÍTICO), **C5** (storage sin `to role`, CRÍTICO seguridad), **C6** (`insert_and_validate_pago` amplio, CRÍTICO seguridad), **C7** (sort de página, MEDIO), **C8** (`between_streets` duplicado, MEDIO), **C9** (paginación en memoria, ALTO), **C10** (histórico), **C11** (revalidate, BAJO), **C12** (match homónimos, MEDIO), **C13** (logging PII, BAJO). C3–C6 y C10 requieren verificación de producción pendiente (§10); los demás son evidencia de archivos/código.

### Hallazgos corregidos
- **C1** pasó de CRÍTICO a **DESCARTADO como riesgo de producción**: el bug es real y está en prod (evidencia de `pg_get_functiondef`), pero la RPC no participa del flujo vivo (solo tests). Documentado como deuda T18.
- **R6 (riesgo arquitectónico)** rectificado: la creación de ventas real es `/api/pre-sales` (INSERT directo), no el RPC. Se incorporó como nuevo riesgo R6 (endpoint sin auth, sin validación de catálogo/stock, sin idempotencia efectiva, sin mantenimiento).

### Hallazgos descartados
- H1: drift/parche manual en `create_checkout_sale` → descartado (byte-idéntica a migración).
- H2: checkout web usa el RPC → falso (usa `/api/pre-sales`).
- H3: la RPC es punto único de falla de ventas → falso.
- H4: C1 rompe el sistema hoy → falso (solo rompe tests y código muerto).
- H5: `lib/products.ts` es la fuente del catálogo → falso (mantenido de la versión B).

### Riesgos reales de producción
1. **R6 (NUEVO)** — el único camino de creación de ventas escribe con service-role, sin autenticación, sin validar catálogo/precios/stock y sin idempotencia. Riesgo ALTO y vigente hoy.
2. **C5 y C6** — si prod replica los archivos, hay dos vectores de escritura no autorizada (storage y pagos de proveedores). Pendiente verificación de DB (§10).
3. **C3 y C4** — reproducibilidad: cualquier reconstrucción desde migraciones/schema.sql queda rota o incompleta.
4. **C9 y C7** — degradación de performance/correctitud en admin con volumen.

### Deuda técnica (nueva en B.1)
- **T18** — cadena de checkout RPC abandonada (incluye RPC con bug en prod).
- **T19** — `/api/pre-sales` sin las protecciones que tenía el camino RPC.
- **T20** — suite `test:db` apuntada a funcionalidad abandonada/rota.

### Próximas etapas recomendadas (a decisión del equipo)
1. Verificar la DB real para C3–C6 y C10 (§10) — pendientes.
2. Decidir el destino de `create_checkout_sale`: reactivarla (corrigiendo su bug de tipos) o eliminarla junto con la cadena muerta (T18).
3. Endurecer `/api/pre-sales` (auth, validación de catálogo/precios/stock, idempotencia, mantenimiento) o reemplazarlo por el camino RPC corregido.
4. Mantener o adaptar `tests/db/checkout-real.test.mjs` según la decisión 2 (T20).

---

## Anexo — Inventario verificado

**Tablas (23):** `product_categories`, `categories`, `products`, `customers`, `profiles`, `sales`, `sale_items`, `installments`, `payments`, `payment_allocations`, `admin_audit_logs`, `credit_accounts`, `credit_installments`, `credit_payments`, `credit_payment_allocations`, `credit_collection_notes`, `credit_account_items`, `proveedores`, `proveedor_contactos`, `proveedor_documentos`, `proveedor_historial_precios`, `proveedor_productos`, `product_price_history`.

**Funciones/RPCs (19):** 5 de Fase 1 (`create_checkout_sale`, `register_sale_payment`, `get_sales_paginated`, `get_customer_balance`, `update_customer_profile`) + `handle_new_auth_user` + `toggle_user_active_atomic` + `insert_and_validate_pago` + 11 de crédito (`register_credit_payment`, `generate_credit_installments`, `get_credit_dashboard`, `get_credit_collection_route`, `import_credit_portfolio_row`, `apply_credit_payment`, `get_credit_commercial_metrics`, `get_credit_monthly_control`, `refresh_credit_overdue`, `get_credit_account_overview`, `fix_credit_account_installments`).

**Policies de aplicación (11):** 4 en `202605260004_rls.sql` (read público categories/products + self read/update profiles) + 6 self-service en `202607280001` + 1 storage pública en `202607230002`.

**Migraciones:** `202605260001`..`202608030001` (39 SQL) + `README.md`.

---

*Informe generado en modo read-only. Ningún cambio fue aplicado a la base ni al código. Revisión B.1 basada en: consulta de producción `pg_get_functiondef('create_checkout_sale')` (2026-08-05) y reconstrucción completa del flujo de creación de ventas.*
