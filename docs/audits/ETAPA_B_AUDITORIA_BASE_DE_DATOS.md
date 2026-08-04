# Etapa B — Auditoría y Hardening de Base de Datos (Informe)

> **Alcance:** Auditoría técnica read-only de la base de datos Supabase (PostgreSQL 15) del proyecto `proyecto0-nextjs`.
> **Método:** 100% verificación sobre archivos (migraciones SQL, `schema.sql`, código de la app). No se ejecutó nada contra una base de datos real; todo lo que depende del estado de producción está marcado explícitamente en §6 "Posibles falsos positivos".
> **Inventario verificado:** 39 migraciones SQL (40 archivos con README), 23 tablas, 19 funciones/RPCs, 11 policies RLS de aplicación (4 catálogo/perfiles + 6 self-service + 1 storage).
> **Fecha:** 2026-08-04.

---

## Resumen ejecutivo

| ID | Hallazgo | Riesgo | Estado | Confianza |
|----|----------|--------|--------|-----------|
| C1 | `create_checkout_sale` asigna valor de tipo `collection_status` a la columna `sale_status` → error de tipos en ejecución | CRÍTICO | Confirmado (en archivos) | 95% |
| C2 | `schema.sql` no reconstruye la DB (sintaxis inválida + objetos faltantes) | CRÍTICO | Confirmado | 100% |
| C3 | Trigger `handle_new_auth_user` existe solo en `schema.sql`, ausente en migraciones; la app no inserta `profiles` | CRÍTICO | Confirmado | 100% |
| C4 | `products.reference_price` y `products.tendencias` usados por la app, ausentes en todo el DDL | CRÍTICO | Confirmado | 95% |
| C5 | Policy de storage `for all` sin `to role` en bucket público de adjuntos de proveedores | CRÍTICO | Confirmado | 100% |
| C6 | `insert_and_validate_pago` (SECURITY DEFINER, sin chequeo de rol) con GRANT a `authenticated` | CRÍTICO | Confirmado | 100% |
| C7 | Paginación de ventas con sort por `customerName` ordena solo la página (JS) | MEDIO | Confirmado | 95% |
| C8 | Import de cartera: `city` ← `between_streets` y `notes` ← `between_streets` (duplicado) | MEDIO | Confirmado | 100% |
| C9 | `getCreditAccountsPaginated` ignora opciones de paginación; filtra y pagina en memoria | ALTO | Confirmado | 100% |
| C10 | `get_credit_dashboard` v1 multiplicaba filas por join directo (histórico, reemplazado) | MEDIO | Confirmado (archivos) | 100% |
| C11 | `revalidateTag('admin-dashboard-analytics', 'default')` con 2 argumentos no invalida caché | BAJO | Confirmado | 100% |
| C12 | Import: match de cliente por `full_name ... limit 1` puede asignar a cliente duplicado | MEDIO | Probable | 90% |
| C13 | `importPortfolioRow` loguea el payload completo (PII) por consola | BAJO | Confirmado | 95% |

**Notas de calidad por área** (ver §9).

---

## 1. Hallazgos Confirmados

### C1 — `create_checkout_sale` rota (CRÍTICO)

**Evidencia:** `supabase/migrations/202605260005_rpcs.sql:453-494` y duplicado en `supabase/schema.sql:824-863`.

**Qué ocurre:** El `insert into sales (...) values (...)` tiene la columna `sale_status` en posición 3 (línea 456) y `collection_status` en posición 9 (línea 462). En el bloque `values` (475-478), el `case ... when (select ...) then 'UP_TO_DATE'::collection_status else 'PENDING'::collection_status end` se ubica en la **posición 3**, es decir, alimenta la columna `sale_status` con un literal de tipo `collection_status`. La columna `collection_status` (posición 9) recibe el literal `'PENDING'` sin cast (línea 484). El `returning` (495-496) devuelve `sales.sale_status`.

**Por qué ocurre:** Desajuste posicional del `case` dentro de la lista de valores; no hay error de compilación porque la sintaxis es válida, solo falla en ejecución con `column "sale_status" is of type sale_status but expression is of type collection_status`.

**Impacto:** Si la base real coincide con los archivos, la creación de ventas por checkout falla siempre. Los tests de integración `tests/db/checkout-real.test.mjs` presuponen que funciona → o la DB real fue parcheada a mano (drift) o los tests no se ejecutan contra el código vigente. Cualquiera de los dos escenarios es un problema: **bug en archivos o esquema divergente no versionado**.

**Probabilidad de impacto:** Alta si se ejecuta tal cual; depende del estado real de la DB (ver §6.1).

**Clasificación:** CRÍTICO. **Estado:** Confirmado (en archivos). **Confianza:** 95%.

---

### C2 — `schema.sql` no puede reconstruir la base (CRÍTICO)

**Evidencia:** `supabase/schema.sql` (1258 líneas).

**Qué ocurre:**
- Línea 1204: `alter table credit_installments enable row level security;` — la tabla no existe en el snapshot (todas las tablas `credit_*` están ausentes) → la restauración falla aquí.
- Líneas 1208 y 1212: `create policy if not exists ...` — sintaxis inválida en PostgreSQL 15.
- Objetos ausentes del snapshot: `credit_accounts`, `credit_installments`, `credit_payments`, `credit_payment_allocations`, `credit_collection_notes`, `credit_account_items`, `product_categories`, `proveedores` (5 tablas), `product_price_history`, la función/trigger `handle_new_auth_user`, y las columnas de soft-delete de `products` (`deleted_at`).

**Por qué ocurre:** `schema.sql` es un snapshot de Fase 1 con parches manuales aplicados después (secciones `20260728`, `20260729`, `20260803`), nunca regenerado.

**Impacto:** Cualquier intento de recrear la DB desde `schema.sql` falla o produce una DB incompleta (sin módulo de crédito, sin proveedores, sin alta de usuarios).

**Clasificación:** CRÍTICO (reproducibilidad/recuperación). **Estado:** Confirmado. **Confianza:** 100%.

---

### C3 — Alta de usuarios depende de un objeto que no está en las migraciones (CRÍTICO)

**Evidencia:** `handle_new_auth_user` + trigger `on_auth_user_created` solo existen en `schema.sql:625-647`. Grep en `supabase/migrations/**` → 0 coincidencias.

**Uso en la app:** El registro usa `supabase.auth.signUp` (`lib/authContext.tsx:92`); la sesión depende de leer el perfil con `getCurrentAuthProfile` (`lib/authContext.tsx:80`, `lib/auth/profileClient.ts:21`); grep de `profiles` en el código → 10 usos, **todos SELECT**, ninguno INSERT. No existe ninguna ruta `app/api/auth/*` (glob → no files found).

**Impacto:** En una DB reconstruida desde migraciones, `signUp` crea el usuario de auth pero ningún perfil; el login posterior falla (el flujo considera "Cuenta desactivada"). La creación de perfiles depende enteramente de un trigger que solo está en el snapshot manual.

**Clasificación:** CRÍTICO (reproducibilidad). **Estado:** Confirmado. **Confianza:** 100% (archivos) / 95% (prod, ver §6.3).

---

### C4 — Columnas `reference_price` y `tendencias` de `products` fuera del DDL (CRÍTICO)

**Evidencia:** La tabla `products` definida en `202605260002:13-33` no incluye `reference_price` ni `tendencias`. Grep en `supabase/**` de ambas → 0 coincidencias. La app las usa en:
- `lib/repositories/productRepository.ts:26,69,73,99,103,286,290,337,341` (SELECT/INSERT/UPDATE).
- `lib/adapters/catalogAdapter.ts:24,28,76,202,204,229,236`.
- `lib/types.ts:16` y `lib/services/catalogService.ts:108-127` (`product.tendencias`, `product.destacado`).

**Por qué ocurre:** Columnas agregadas manualmente en producción (drift) o creadas fuera de control de versiones; las migraciones no reflejan el esquema real.

**Impacto:** En cualquier DB construida desde migraciones, `listProducts`, `createProduct` y `updateProduct` fallan en runtime (columna inexistente). El estado de producción no es verificable sin acceso (ver §6.2).

**Clasificación:** CRÍTICO (reproducibilidad). **Estado:** Confirmado (en archivos). **Confianza:** 95%.

---

### C5 — Policy de storage pública sin restricción de rol (CRÍTICO, seguridad)

**Evidencia:** `supabase/migrations/202607230002_create_proveedor_adjuntos_bucket.sql:1-10`.

**Qué ocurre:**
- Línea 3: bucket `proveedor-adjuntos` creado con `public = true`.
- Líneas 6-10: `create policy "proveedor_adjuntos_public_access" on storage.objects for all using (bucket_id = 'proveedor-adjuntos') ... with check (bucket_id = 'proveedor-adjuntos')` — **sin cláusula `to role`**.

**Impacto:** En RLS, una policy sin `to role` se aplica a **todas** las roles, incluida `anon`. Cualquier visitante puede insertar/actualizar/eliminar objetos en el bucket de adjuntos de proveedores (facturas/documentos sensibles), y los objetos son públicos por URL.

**Clasificación:** CRÍTICO. **Estado:** Confirmado. **Confianza:** 100% (semántica SQL) / 95% (prod, ver §6.5).

---

### C6 — `insert_and_validate_pago` ejecutable por cualquier usuario autenticado (CRÍTICO, seguridad)

**Evidencia:** `supabase/migrations/202607250001_insert_and_validate_pago.sql:1-2,61-62`.

**Qué ocurre:** La función es `security definer` (línea 2) y su cuerpo no verifica el rol de quien la invoca. Las líneas 61-62 hacen:
`grant execute on function insert_and_validate_pago(text, text, date, numeric, text) to authenticated;`

**Impacto:** Todo usuario registrado (rol `authenticated`) puede registrar pagos de proveedores, saltándose cualquier control de autorización aplicativo. El caller `lib/services/admin/pagos.service.ts` no compensa esto a nivel de BD (solo a nivel de UI).

**Clasificación:** CRÍTICO. **Estado:** Confirmado. **Confianza:** 100% (archivos) / 95% (prod, ver §6.6).

---

### C7 — Paginación de ventas rota con sort por `customerName` (MEDIO)

**Evidencia:** `lib/repositories/saleRepository.ts:484-540`.

**Qué ocurre:** La query SQL ordena por `sale_date` (default de `getSaleOrderColumn`, línea 318) y aplica `range(start, end)` (línea 519). Después, en Node, se ordena por `customerName` **solo la página obtenida** (529-534).

**Impacto:** Al paginar con orden "customer", las páginas 2+ devuelven registros incorrectos/duplicados (el orden estable no corresponde al SQL). El orden por nombre nunca es global.

**Clasificación:** MEDIO. **Estado:** Confirmado. **Confianza:** 95%.

---

### C8 — Import de cartera: `between_streets` duplicado en `city` y `notes` (MEDIO, calidad de datos)

**Evidencia:** `supabase/migrations/202606190001_fix_import_overpayment_tolerance.sql:40-48` (v4 vigente). La misma duplicación existe en la v3 (`202606080001_fix_credit_origin_period.sql:57-68`). El payload lo envía `lib/repositories/creditAccountRepository.ts:500-505` (`between_streets: row.betweenStreets`).

**Qué ocurre:** Al crear un cliente nuevo durante el import, el insert recibe `city` ← `between_streets` y `notes` ← `between_streets` (el mismo valor dos veces). El campo de localidad real no se persiste.

**Impacto:** Clientes importados quedan con ciudad incorrecta y nota duplicada/inservible. Afecta reportes y datos maestros.

**Clasificación:** MEDIO. **Estado:** Confirmado. **Confianza:** 100%.

---

### C9 — `getCreditAccountsPaginated` ignora la paginación (ALTO, performance)

**Evidencia:** `lib/repositories/creditAccountRepository.ts:157-180` (`_options` recibido pero no usado); `lib/services/creditAccountService.ts:301-335` (filtros `search`, `statusFilter`, `filterMonth/Year`, `paymentStatus` y `slice` en memoria); `app/api/admin/credit-accounts/route.ts:34` (permite `pageSize` hasta 100000).

**Qué ocurre:** La consulta trae **todas** las cuentas activas + **todas** las instalaciones (en lotes), y la paginación/filtrado ocurre en Node sobre el total. El tamaño del dataset crece sin límite práctico.

**Impacto:** Uso de memoria, CPU y latencia proporcionales al total de cuentas; en volumen real degrada el panel admin de crédito.

**Clasificación:** ALTO. **Estado:** Confirmado. **Confianza:** 100%.

---

### C10 — `get_credit_dashboard` v1 multiplicaba filas (MEDIO, histórico)

**Evidencia:** `202606010002_credit_dashboard.sql:54-84` — join directo a `credit_payments cp` sin agregación previa por cuenta; `sum(cp.amount)` inflado por filas de instalaciones. Reemplazado por v2 en `202606020001_credit_portfolio_update.sql:15-90` que agrupa por cuenta y es correcta (usa `account_totals`, `generate_series` para 12 meses).

**Impacto:** Solo relevante si la DB real quedó con v1 (ver §6.4). En archivos, el bug existió y fue corregido.

**Clasificación:** MEDIO (histórico). **Estado:** Confirmado (en archivos). **Confianza:** 100%.

---

### C11 — `revalidateTag` con dos argumentos no invalida nada (BAJO, Etapa C)

**Evidencia:** `lib/services/admin/maintenance.ts:604-605` — `revalidateTag('admin-dashboard-analytics', 'default')`.

**Qué ocurre:** El segundo argumento hace que la firma no coincida con el tag usado en `app/api/admin/dashboard/analytics/route.ts` → el caché de 60s nunca se invalida vía `cache_clear`.

**Impacto:** El dashboard admin puede mostrar datos de hasta 60s de antigüedad tras limpiar caché.

**Clasificación:** BAJO/MEDIO. **Estado:** Confirmado. **Confianza:** 100%.

---

### C12 — Match de cliente por `full_name ... limit 1` (PROBABLE)

**Evidencia:** `202606190001:32-37` (y lógica idéntica en v2/v3). Si no hay match por teléfono, se busca `where full_name = v_full_name limit 1`. El índice único parcial `uq_customers_phone_partial` protege el teléfono, pero no hay restricción de unicidad sobre `full_name`.

**Impacto:** Con clientes homónimos, el import asigna el crédito al primero arbitrario (sin garantía de que sea el correcto) en lugar de fallar o pedir decisión.

**Clasificación:** MEDIO. **Estado:** Probable (depende de que existan duplicados). **Confianza:** 90%.

---

### C13 — Logging de payload con PII (BAJO, privacidad)

**Evidencia:** `lib/repositories/creditAccountRepository.ts:482-505` — `console.log`/`console.error` del payload completo del import (nombres, teléfonos, direcciones) a logs del servidor.

**Impacto:** Exposición de datos personales en logs; riesgo en entornos con agregación de logs.

**Clasificación:** BAJO. **Estado:** Confirmado. **Confianza:** 95%.

---

## 2. Hallazgos Descartados

| Claim / sospecha | Veredicto | Evidencia |
|------------------|-----------|-----------|
| `credit_payment_allocations` sin RLS | **FALSO** | `202606010003_credit_installments.sql:49` habilita RLS. |
| `sales`, `sale_items`, `installments`, `payments` sin RLS = bug | **NO es bug** | `202605260004_rls.sql` deja esas tablas default-deny a propósito: el acceso es solo vía RPCs SECURITY DEFINER y cliente anon. Es decisión de diseño (ver §3-R1). |
| `apply_credit_payment` usada en la app | **FALSO** | Grep → 0 usos en app y tests; el caller real es `registerCreditPaymentRpc`. Es RPC muerta nunca dropeada (deuda, §4-T3). |
| Catálogo público lee del hardcode `lib/products.ts` | **FALSO hoy** | `app/page.tsx`, `app/categoria/[...]` y `checkoutSaleService.ts` importan `catalogService`, que lee de Supabase vía `productRepository`. `lib/products.ts` no se importa en ningún lado. |
| `handle_new_auth_user` existe en migraciones | **FALSO** | Solo en `schema.sql:625-647` (pasó a C3 CRÍTICO). |
| Bug de paginación en crédito vía SQL | **FALSO** | No es SQL: es filtrado/paginación en Node (C9). |
| 41 migraciones (proyección previa) | **FALSO** | Conteo exacto: 39 SQL + README. |

---

## 3. Riesgos Arquitectónicos

### R1 — RLS "todo o nada" + anon key en el cliente (MEDIO/ALTO)
Solo 11 policies en archivos; la seguridad efectiva de ventas/crédito depende de que cada RPC `security definer` valide bien y de que la anon key no se filtre. La ruta `app/api/mi-cuenta/resumen/route.ts` usa el cliente con anon key y se apoya en RLS self-service. Un error de configuración (como C5/C6) amplifica el riesgo a todo el dataset. **Arquitectura frágil:** autorización repartida entre RPCs, policies y capa aplicativa sin una barrera central.

### R2 — Doble fuente de verdad del catálogo (histórico)
`lib/products.ts` (hardcodeado) fue la fuente original; hoy el storefront lee solo de Supabase. El archivo hardcodeado quedó sin uso (deuda T, §4). Además no hay migración/seed que documente cómo se cargó el catálogo en `products` → origen del contenido desconocido.

### R3 — Agregación y paginación en Node
Varios repositorios traen el dataset completo y filtran/paginan en JS (`getCreditAccountsPaginated`, cobranza, resumen de clientes con deuda). Sin límite real de `pageSize` (hasta 100000). El costo crece con el volumen total, no con la página.

### R4 — RPCs `security definer` con defaults amplios
Casi todos los RPCs de crédito son `security definer`. La mayoría usa RLS admin/staff correctamente, pero la autorización es per-RPC (C6 es el extremo). No hay capa central de autorización.

### R5 — Doble estado de cuentas de crédito
`credit_accounts.is_active` es flag manual de visibilidad, mientras el estado financiero (paid/pending/overdue) se deriva de `credit_installments.remaining_amount`. Los dos pueden contradecirse: una cuenta morosa con `is_active=false` desaparece de cobranza y control mensual sin que su deuda cambie. Diseño frágil para operaciones.

### R6 — Checkout dependiente de un único RPC
Toda la creación de ventas pasa por `create_checkout_sale` (idempotencia por `checkout_request_id` + recovery 23505 en `saleRepository.ts:363-382`). Si ese RPC está roto en archivos (C1), el sistema de ventas es un punto único de falla.

---

## 4. Deuda Técnica

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

---

## 5. Inconsistencias de documentación

- `docs/audits/AUDITORIA_TECNICA_PRE_PRODUCCION.md`: "31 migraciones" → reales **39**. "23 tablas" ✅, "19 RPCs" ✅, columnas fantasma ✅ (con matiz C4), fallo `schema.sql:1204` ✅, `revalidateTag` de 2 args ✅.
- `AGENTS.md`: "Product catalog is hardcoded in `lib/products.ts`" → **desactualizado**; el storefront lee de Supabase y `lib/products.ts` no se importa.
- `README` de migraciones: cobertura parcial (T15).
- `202606080001` anuncia en su cabecera "Revoke public execution" — **pendiente de verificar en DB real** si el REVOKE se aplicó realmente (no hay sentencia visible en el archivo).
- `validate_runtime_contract`: su contrato promete más cobertura de la que valida (T4).

---

## 6. Posibles falsos positivos (requieren DB real)

Estos puntos **no se pueden confirmar/descartar** desde archivos. Para resolverlos hace falta consultar la base real (`psql`/Studio):

1. **Estado de `create_checkout_sale` en prod (C1).** Si los tests `tests/db/checkout-real.test.mjs` pasan contra la DB real, el cuerpo del RPC fue parcheado manualmente y diverge de `202605260005_rpcs.sql`. Verificar con `select pg_get_functiondef('create_checkout_sale'::regproc)`.
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

## 7. Lista de mejoras futuras (solo análisis; NO implementar en esta etapa)

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

## 8. Qué NO tocar (diseño correcto que no debe "arreglarse")

- **`register_credit_payment`** (`202606080001:314-403`): valida monto > 0 y contra `SUM(remaining_amount)`, inserta payment, asigna FIFO con `FOR UPDATE`, verifica asignación completa; errores tipados (`PAYMENT_INVALID_AMOUNT`, `PAYMENT_EXCEEDS_DEBT`). Único matiz: TOCTOU teórico entre validación y lock (no accionable sin DB).
- **`generate_credit_installments`** (`202606010003:81-125`): matemática de truncamiento para cuotas exactas.
- **CHECKs de integridad de cuotas**: `paid_amount + remaining_amount = original_amount` en ambas tablas; `UNIQUE (credit_account_id, installment_number)`; CHECKs de status.
- **RLS default-deny** en tablas transaccionales y **solo lectura pública** en catálogo (`202605260004`).
- **Policies admin/staff** de crédito vía subquery a `profiles.role`.
- **Policies self-service** para `mi-cuenta` (`202607280001`: customers, credit_accounts, credit_installments, credit_payments, credit_account_items, credit_collection_notes).
- **GRANT column-level en `profiles`** (`202608030001`) — endurecimiento correcto.
- **GIN trgm** para búsquedas de clientes/crediticias (`202607280001`).
- **`findOrCreateCustomer`** con retry 23505 (phone/email únicos).
- **Idempotencia de checkout** por `checkout_request_id` + recovery 23505 (`saleRepository.ts:363-382`).
- **CHECKs money >= 0** y **normalización de inputs** (trim, email en minúsculas).
- **`payments.payment_request_id` UNIQUE parcial** e índice asociado.
- **FK restrictiva `sales.customer_id`** (sin ventas huérfanas).
- **`BATCH_SIZE = 200`** en queries batched (evita límites de tamaño de query).

---

## 9. Notas de calidad por área (1-10)

| Área | Nota | Justificación |
|------|------|---------------|
| Arquitectura | 7 | Separación clara repo/service/route y path alias coherente; pero autorización repartida (R1) y doble estado de crédito (R5). |
| Seguridad | 5 | RLS bien diseñada en su mayoría y GRANT column-level; penalizada por C5, C6 y el falso verde del contrato (T4). |
| Rendimiento | 5 | Índices y consultas clave bien planteados; C9/C10/T14 (carga completa + agregación en Node) lo degradan. |
| Escalabilidad | 4 | Sin paginación real en crédito y sin límite de `pageSize`; no escala con volumen. |
| Backend (Next.js/services) | 7 | Idempotencia, retries y manejo de errores cuidados; C7 (sort en página) y C11 (revalidate) son errores puntuales. |
| Frontend | 8 | Rutas, estados y accesibilidad consistentes; catálogo y admin cohesionados. |
| Base de datos | 6 | Modelo 3NF razonable y RLS pensada; C1/C3/C4 (drift y objetos faltantes) y T1/T2 (índices) la penalizan. |
| UX | 8 | Flujos de checkout/crédito/cobranza completos y consistentes. |
| Mantenibilidad | 5 | 39 migraciones con README parcial, `schema.sql` inservible, funciones muertas y dualidad de fuentes (T5/T15/T3/T2). |

---

## Anexo — Inventario verificado

**Tablas (23):** `product_categories`, `categories`, `products`, `customers`, `profiles`, `sales`, `sale_items`, `installments`, `payments`, `payment_allocations`, `admin_audit_logs`, `credit_accounts`, `credit_installments`, `credit_payments`, `credit_payment_allocations`, `credit_collection_notes`, `credit_account_items`, `proveedores`, `proveedor_contactos`, `proveedor_documentos`, `proveedor_historial_precios`, `proveedor_productos`, `product_price_history`.

**Funciones/RPCs (19):** 5 de Fase 1 (`create_checkout_sale`, `register_sale_payment`, `get_sales_paginated`, `get_customer_balance`, `update_customer_profile`) + `handle_new_auth_user` + `toggle_user_active_atomic` + `insert_and_validate_pago` + 11 de crédito (`register_credit_payment`, `generate_credit_installments`, `get_credit_dashboard`, `get_credit_collection_route`, `import_credit_portfolio_row`, `apply_credit_payment`, `get_credit_commercial_metrics`, `get_credit_monthly_control`, `refresh_credit_overdue`, `get_credit_account_overview`, `fix_credit_account_installments`).

**Policies de aplicación (11):** 4 en `202605260004_rls.sql` (read público categories/products + self read/update profiles) + 6 self-service en `202607280001` + 1 storage pública en `202607230002`.

**Migraciones:** `202605260001`..`202608030001` (39 SQL) + `README.md`.

---

*Informe generado en modo read-only. Ningún cambio fue aplicado a la base ni al código.*
