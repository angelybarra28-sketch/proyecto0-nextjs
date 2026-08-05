# Etapa E — Plan Maestro de Refactorización e Implementación

> **Entrada:** Auditorías completas **Etapa A** (`AUDITORIA_TECNICA_PRE_PRODUCCION.md`), **Etapa B** (B.1), **Etapa C** y **Etapa D** (validación real de datos).
> **Naturaleza:** Plan de trabajo. **No** se corrige código, **no** se generan migraciones, **no** se modifica ningún archivo salvo este documento.
> **Regla de oro:** todo cambio propuesto está respaldado por hallazgos de A/B/C/D. Se respeta el resultado de Etapa D: **no hay corrupción detectada** (muestra de 2 ventas), por lo que **no se planifica ninguna reparación de datos de ventas**; D5/D7 quedan como "sin evidencia" y **no generan tareas**.

---

## Resumen Ejecutivo

El proyecto tiene **3 prioridades inmediatas (P0)** según la evidencia: (1) cerrar el vector de **escalada de rol ADMIN** en RLS (A/S1), (2) **proteger la escritura del único flujo vivo de ventas** `/api/pre-sales` (A/S3 = C/F4) y (3) **validar montos en servidor** (C/F2), el riesgo latente de mayor severidad que Etapa D no pudo descartar. La base NO presenta corrupción (D), pero arrastra **deuda de reproducibilidad** (C2–C4) que impide reconstruirla, y el riesgo **F7 ya está materializado** (100% de ítems de venta sin referencia a producto, confirmado en D).

El plan se organiza en **7 fases** (Fase 0…Fase 6): Seguridad e integridad → Reproducibilidad → Núcleo de ventas → Consistencia → Crédito/importación → Limpieza técnica → Refactor y cierre. Cada tarea (W01…W38) referencia hallazgos ya documentados; no se repiten descripciones de hallazgos aquí.

Duración estimada: **~9 semanas calendario** (≈ 260–320 horas de esfuerzo con 1 desarrollador), comprimible a 5–6 semanas con 2+ personas porque Fases 3–6 son paralelizables entre sí.

---

## 1. Prioridades (catálogo de tareas)

Leyenda: **P0**=antes de nada · **P1**=alta · **P2**=importante · **P3**=mejora futura.
Origen = hallazgo(s) de A/B/C/D que respaldan la tarea.

| ID | Descripción | Origen | Prioridad | Impacto | Complejidad | Tiempo est. | Dependencias | Riesgo | Rollback |
|----|-------------|--------|-----------|---------|-------------|-------------|--------------|--------|----------|
| W01 | Cerrar escalada de rol ADMIN en RLS `profiles` (restringir columnas/rol) | A/S1, A/M1 | P0 | CRÍTICO | Baja | 4–6 h | Verificación previa (estado tras `202608030001`) | Medio | Migración reversible |
| W02 | Bucket `proveedor-adjuntos` a privado + signed URLs | A/S2, A/M2 = B/C5 | P0 | CRÍTICO | Media | 6–8 h | Pruebas con adjuntos existentes | Medio | Config bucket + migración |
| W03 | Control de acceso/rate-limit + mantenimiento + límites de payload en `/api/pre-sales` | A/S3, A/M3 = C/F4, B/T19, C/T25 | P0 | CRÍTICO | Media | 8–12 h | Decisión de producto: auth completa vs rate-limit | Medio | Feature flag / revert commit |
| W12 | Validación server-side de precios/cantidades contra catálogo | C/F2, C/T23 | P0 | ALTO | Media | 6–10 h | — | Medio | Flag warn→reject |
| W04 | Restore de backups transaccional + límite de tamaño | A/S15, A/M4 | P1 | ALTO | Media | 8 h | — | Medio | Revert commit |
| W05 | Errores genéricos al cliente + log con request-id | A/S9, A/M5 = C/F8, B/T27 | P1 | MEDIO | Baja | 2–4 h | — | Bajo | Revert commit |
| W06 | Regenerar o deprecar `schema.sql` | B/C2, B/T5 | P1 | CRÍTICO (reproducibilidad) | Media | 6–8 h | Snapshot real del esquema | Bajo | Conservar backup del snapshot actual |
| W07 | Alta de perfiles en migraciones (función + trigger) + verificar backfill | B/C3 | P1 | CRÍTICO (reproducibilidad) | Media | 8–12 h | Migración base (orden) | **Alto** | Trigger desactivable |
| W08 | Alinear `reference_price`/`tendencias` (columna o quitar del código) | B/C4 | P1 | CRÍTICO (reproducibilidad) | Media | 4–8 h | Decisión de producto | Medio | Migración/commit reversible |
| W09 | Endurecer `insert_and_validate_pago` (definer + grants) | B/C6 | P1 | CRÍTICO (seguridad) | Media | 6 h | — | Medio | Migración reversible |
| W36 | Revisión integral RLS + alcance service-role + reforzar `proxy.ts` | A/M6, A/M7 | P1 | ALTO | Media-Alta | 8–12 h | W01, W09 cerradas | Medio | Revert commits |
| W33* | **Decisión** destino cadena RPC checkout (revivir vs eliminar) | B/T18, B/T20, C/F1 | P1 | MEDIO | Baja | 2–4 h | — | Bajo | n/a (decisión) |
| W10 | Creación de venta transaccional (RPC corregida o nueva) | C/F1, C/T21, B/T18 | P1 | ALTO | **Alta** | 16–24 h | W33*, W12, W11 | **Alto** | Feature flag → volver al path actual |
| W11 | Idempotencia end-to-end (`checkout_request_id` desde el cliente) | C/F3, C/T22 | P1 | ALTO | Media | 6–10 h | W13 (complementaria) | Medio | Revert commit |
| W13 | Botón "Continuar compra" con lock/loading | C/F3, C/T24 | P1 | MEDIO | Baja | 2–4 h | — | Bajo | Revert commit |
| W14 | Persistir `legacy_product_id`/`product_id`/slug en `sale_items` | C/F7, C/T26, **D confirmado** | P1 | MEDIO | Media | 8–12 h | W12 (resolución server-side del producto) | Medio | Revert; sin backfill histórico posible |
| W18 | Sort por `customerName` en BD (no en memoria) | B/C7 = C/F13 | P2 | MEDIO | Baja | 2–4 h | — | Bajo | Revert commit |
| W15 | Política de stock (validar en ruta / descontar al confirmar) | C/F6, C/T28 | P2 | MEDIO | Baja | 4–6 h | W12, W14 (link producto) | Medio | Feature flag |
| W16 | Fuente única de verdad de cuotas (UI = WhatsApp = BD) | C/F5, C/T29 | P2 | MEDIO | Media | 8–12 h | W10 (server calcula cuotas) | Medio | Revert commits |
| W19 | `findOrCreateCustomer` con `onConflict`/límite (sin recursión) | C/F9, C/T30 | P2 | MEDIO | Baja | 2–4 h | — | Bajo | Revert commit |
| W20 | Precio como número en todo el flujo (eliminar `parseInt` de formatos) | C/F10, C/T31 | P2 | BAJO | Media | 6–8 h | — | Medio | Revert + regresión de precios |
| W21 | WhatsApp antes del await / fallback link / `clearCart` condicional | C/F11, C/T32 | P2 | BAJO | Baja | 3–5 h | — | Bajo | Revert commit |
| W17 | Cuotas por calendario mensual (fecha primera cuota configurable) | C/F12 | P3 | BAJO | Baja | 3–5 h | W16 | Bajo | Revert commit |
| W22 | Corregir mapeo `city`/`notes` ← `between_streets` en import | B/C8 | P2 | MEDIO | Baja | 3–5 h | — | Bajo | Revert commit |
| W23 | Paginación real de cuentas de crédito (eliminar paginación en memoria) | B/C9, A/P4 | P1 | ALTO | Media-Alta | 8–12 h | — | Medio | Revert commit |
| W24 | Match de cliente por identificador estable (no `full_name limit 1`) | B/C12 | P2 | MEDIO | Media | 4–6 h | W22 | Bajo | Revert commit |
| W25 | Cache admin correcta (`revalidateTag` 1 arg) y eliminar carga completa en `checkoutSaleService` | B/C11, A/P6 | P2 | BAJO | Baja | 3–5 h | W33 (cadena muerta) | Bajo | Revert commit |
| W30 | `smart-dashboard`: agregados a SQL/RPC + paginación real | A/P2, A/P4 | P2 | MEDIO | Media-Alta | 8–12 h | — | Medio | Revert commit |
| W26 | Lint a 0 (errores conocidos de A) | A (Frontend) | P2 | MEDIO | Baja-Media | 6–8 h | — | Bajo | Revert commit |
| W31 | Depurar índices duplicados/btree inservibles (tras medición) | B/T1, B/T2 | P2 | BAJO | Baja | 4–6 h | Métricas `pg_stat_user_indexes` | Bajo | Migración reversible |
| W32 | Actualizar `validate_runtime_contract` al alcance real | B/T4 | P2 | MEDIO | Media | 4–6 h | W06 (baseline) | Bajo | Revert commit |
| W35 | Higiene de datos en producción (revisar venta `300` y clientes de prueba) | **D** (C-D4/C-D5) | P2 | MEDIO | Baja | 3–5 h | Aprobación humana + backup | Medio | n/a (requiere backup previo) |
| W33 | Eliminación de código muerto (cadena RPC, RPCs y componentes) | B/T3, B/T18, A (dead code) | P2 | MEDIO | Media | 6–8 h | W33* (decisión) | Medio | Revert commit |
| W34 | Reorientar suite `test:db` a la funcionalidad viva | B/T20 | P1 | MEDIO | Media | 6–8 h | W33* | Bajo | Revert commit |
| W27 | Refactor `app/admin/ventas/nueva` (componentes) + arreglar link | A (Frontend/UX) | P3 | MEDIO | **Alta** | 12–20 h | — | Medio | Revert commit |
| W28 | Unificar `lib/services` (viejas vs `admin`) | A (Código) | P3 | MEDIO | Media-Alta | 8–12 h | W33 | Medio | Revert commit |
| W29 | Conectar o deprecar tipos financieros de `types/` | A (Código) | P3 | MEDIO | Media | 4–8 h | W28 | Bajo | Revert commit |
| W37 | Documentar migraciones (README/índice) | B/T15 | P3 | BAJO | Baja | 4–6 h | — | Bajo | n/a |
| W38 | Limpieza menor de esquema: precisión `numeric`, `payment_method` como enum, `credit_installments.status` enum, retención `admin_audit_logs`, sobre-pago registrado, `mainCustomer` ordenado, `enable_signup`, columnas huérfanas | B/T6, T7, T8, T9, T10, T11, T12, T16, T17 | P3 | BAJO | Baja-Media | 6–10 h | Varias | Bajo | Migraciones reversibles |

\*W33 aparece dos veces: la **decisión** (W33*, Fase 2, gate) y el **borrado físico** (W33, Fase 6).

---

## 2. Roadmap (fases)

### Fase 0 — Seguridad e integridad (P0) — objetivo: sin escaladas, sin escrituras sin control, sin montos falsos
- **Tareas:** W01, W02, W03, W12.
- **Riesgos que cierra:** A/S1, A/S2, A/S3, C/F4, C/F2.
- **Duración:** ~5–6 días. **Complejidad:** media.
- **Nota:** W12 y la parte no-migración de W03 pueden empezar el día 1 (no requieren migración).

### Fase 1 — Reproducibilidad y vectores de escritura (P1)
- **Tareas:** W04, W05, W06, W07, W08, W09, W36.
- **Riesgos que cierra:** A/S15, A/S9, B/C2, B/C3, B/C4, B/C6, A/M6/M7.
- **Duración:** ~7–10 días. **Complejidad:** media-alta (W07 por el flujo de auth).
- **Nota:** todas tocan migraciones → ejecutar en orden único (un autor por commit) para evitar conflictos.

### Fase 2 — Núcleo de ventas (P1)
- **Tareas:** W33* (decisión) → W10 → W11, W13, W14.
- **Riesgos que cierra:** C/F1, C/F3, C/F7 (confirmado en D).
- **Duración:** ~6–8 días. **Complejidad:** alta (W10).
- **Nota:** la decisión W33* desbloquea W10 (revivir `create_checkout_sale` corregida vs. RPC nueva).

### Fase 3 — Ventas: consistencia y UX (P2)
- **Tareas:** W15, W16, W17, W19, W20, W21.
- **Riesgos que cierra:** C/F5, C/F6, C/F9, C/F10, C/F11, C/F12.
- **Duración:** ~6–8 días. **Complejidad:** media.

### Fase 4 — Crédito e importación (P1/P2)
- **Tareas:** W23, W30, W22, W24.
- **Riesgos que cierra:** B/C9, A/P2/P4, B/C8, B/C12.
- **Duración:** ~5–7 días. **Complejidad:** media.

### Fase 5 — Limpieza técnica (P2/P3)
- **Tareas:** W18, W25, W26, W31, W32, W35.
- **Riesgos que cierra:** B/C7, B/C11, A/P6, B/T1/T2/T4, observaciones de D.
- **Duración:** ~4–6 días. **Complejidad:** baja-media.

### Fase 6 — Refactor y cierre (P3)
- **Tareas:** W33 (borrado), W34, W27, W28, W29, W37, W38.
- **Duración:** ~8–12 días. **Complejidad:** media (paralelizable por módulo).

---

## 3. Dependencias (grafo)

```
W01 ── verificación previa ──┐
W09 ─────────────────────────┼──> W36 (revisión RLS integral)
                             │
W12 (validación precios) ──────> W14 (link producto) ──> W15 (stock)
                             └──> W10 (RPC transaccional) ──> W16 (cuotas) ──> W17 (calendario)
W33* (decisión T18/T20) ──────> W10  y  W33 (borrado) ──> W25 (cache/P6) ──> W34 (tests)
W13 y W11 ── paralelas, complementarias (idempotencia + lock)
W11 ──> W10 (el RPC reutiliza el recovery 23505 por checkout_request_id)
W06 (baseline de esquema) ──> W07, W08, W09, W31, W32  (migraciones ordenadas)
W22 ──> W24 (import: mapeo + matching)  ·  W23 y W30 ── independientes entre sí
W20 ── paralela a todo (no bloquea)     ·  W26, W27, W28, W29, W37, W38 ── cola final, paralelizables
```

**Reglas del grafo:**
1. Fase 0 antes que todo; dentro de ella, las no-migración (W12, W03 parcial) van primero.
2. W10 es el nodo crítico: depende de W33*, W12 y W11; si se decide eliminar la RPC (W33* = eliminar), W10 se reemplaza por un RPC nuevo equivalente (misma dependencia de W12/W11).
3. W14/W15 (trazabilidad y stock) solo son correctos si W12 resolvió el producto server-side.
4. Las migraciones de la Fase 1 se serializan (un solo autor por commit) para no colisionar.

---

## 4. Riesgos (del plan)

| Riesgo | Tareas | Severidad | Mitigación planificada |
|--------|--------|-----------|------------------------|
| Regresión en el único flujo vivo de ventas al migrar a RPC transaccional | W10 | **Crítico** | Feature flag: convivencia del path actual y el nuevo; rollback = revert commit |
| Romper el alta de usuarios al tocar auth/trigger | W07 | Alto | Trigger desactivable + pruebas del flujo de registro/login antes y después |
| Romper descargas de adjuntos de proveedores al privatizar bucket | W02 | Medio | Signed URLs probadas con archivos existentes antes del cambio de policy |
| Rechazar pedidos legítimos por validación de precios | W12 | Medio | Modo "warn" (registra) → "reject" (bloquea) por flag |
| Precios alterados silenciosamente por cambio a número (sin `parseInt`) | W20 | Medio | Regresión de precios en carrito/checkout/admin |
| Borrar código que aún se usa (cadena RPC, componentes) | W33 | Medio | Verificación de callers (grep) por cada archivo antes del borrado |
| Eliminar datos históricos sin autorización | W35 | Medio | Backup previo + aprobación humana explícita; solo lectura primero |
| Migraciones concurrentes en Fase 1 | Fase 1 | Medio | Ejecución serializada, un autor por commit |
| Muestra mínima de datos (2 ventas): decisiones de datos basadas en D no son generalizables | todo | — | Las tareas de datos (W35) son revisión, no reparación |

---

## 5. Estrategia de despliegue (compatibilidad por tarea)

Clasificación por tarea. Leyenda: **Prod**=compatible sin downtime · **Mant**=requiere mantenimiento/ventana · **Mig**=requiere migración · **Flag**=desplegable por feature flag · **Backfill**=necesita backfill · **Script**=necesita script temporal · **Riesgo**=riesgo de despliegue.

| ID | Prod | Mant | Mig | Flag | Backfill | Script | Riesgo de despliegue | Justificación |
|----|:----:|:----:|:---:|:----:|:--------:|:------:|----------------------|---------------|
| W01 | ✅ | | ✅ | | | | Medio | Policy/GRANT cambia permisos; reversión simple |
| W02 | | ✅ | ✅ | | | | Medio | Afecta accesos existentes; requiere pruebas de signed URLs |
| W03 | ✅ | | | ✅ | | | Medio | Cambia comportamiento del endpoint; flag para activar |
| W12 | ✅ | | | ✅ | | | Medio | Flag warn→reject para no cortar ventas |
| W04 | ✅ | | | | | | Medio | Lógica de restore; no afecta el runtime |
| W05 | ✅ | | | | | | **Muy bajo** | Solo formato de respuesta |
| W06 | | ✅ | | | | ✅ | Bajo | Regenerar snapshot; afecta `supabase db reset` |
| W07 | | ✅ | ✅ | | ✅ | ✅ | **Alto** | Toca alta de usuarios; backfill de perfiles existentes |
| W08 | ✅ | | ✅ | | | | Medio | Migración de columnas o limpieza de código |
| W09 | ✅ | | ✅ | | | | Medio | Cambia grants/función de pagos de proveedores |
| W36 | | | ✅ | | | | Medio | Revisión integral de RLS |
| W10 | ✅ | | ✅ | ✅ | | | **Crítico** | Núcleo de ventas; flag de convivencia |
| W11 | ✅ | | | ✅ | | | Medio | Cambia contrato del body (request id del cliente) |
| W13 | ✅ | | | | | | **Muy bajo** | Solo UI |
| W14 | ✅ | | | ✅ | | | Medio | Front envía id + server resuelve; sin backfill histórico |
| W18 | ✅ | | | | | | Bajo | Query de orden en BD |
| W15 | ✅ | | | ✅ | | | Medio | Decision comercial; flag |
| W16 | ✅ | | | | | | Medio | Unificación UI/WhatsApp/BD de cuotas |
| W19 | ✅ | | | | | | Bajo | Interno del repo |
| W20 | ✅ | | | | | | Medio | Cambio de transporte de precios; regresión |
| W21 | ✅ | | | | | | Bajo | UX |
| W17 | ✅ | | | | | | Bajo | Cálculo de fechas |
| W22 | ✅ | | | | | | Bajo | Import |
| W23 | ✅ | | | | | | Medio | Cambio de query/RPC de crédito |
| W24 | ✅ | | | | | | Bajo | Import |
| W25 | ✅ | | | | | | Bajo | Cache |
| W30 | ✅ | | | | | | Medio | Dashboard admin |
| W26 | ✅ | | | | | | Bajo | Lint |
| W31 | | | ✅ | | | | Bajo | Drop de índices; medir antes |
| W32 | ✅ | | ✅ | | | | Bajo | Contrato de runtime |
| W35 | | ✅ | | | | ✅ | Medio | Ops sobre datos; requiere backup + aprobación |
| W33 | ✅ | | ✅ | | | | Medio | Borrado; verificar callers |
| W34 | ✅ | | | | | | Bajo | Tests |
| W27 | ✅ | | | | | | Medio | Refactor página admin |
| W28 | ✅ | | | | | | Medio | Unificar servicios |
| W29 | ✅ | | | | | | Bajo | Tipos |
| W37 | ✅ | | | | | | **Muy bajo** | Docs |
| W38 | | | ✅ | | | | Bajo | Limpieza de esquema |

---

## 6. Estrategia de testing (por fase)

### Fase 0
- **Unitarios:** validación de montos (precios contra catálogo, 0, negativos, cantidad no entera); reglas de rate-limit.
- **Integración:** POST `/api/pre-sales` con payload abusivo (items vacíos, price 0, fullName largo, volcado de requests).
- **DB:** verificación de policies RLS (intento de update de `role` como usuario normal).
- **Manuales:** alta/login de un usuario normal; descarga de un adjunto de proveedor (antes/después de W02).
- **Borde:** precio del carrito con formato es-AR; multi-ítem.

### Fase 1
- **Unitarios:** restore/validate; API errors genéricos.
- **Integración:** flujo completo de signUp → perfil creado (W07); restore dry-run.
- **DB:** trigger `handle_new_auth_user` inserta `profiles`; `insert_and_validate_pago` con roles (W09).
- **Manuales:** `supabase db reset` desde el snapshot regenerado (W06).
- **Borde:** usuario registrado antes del backfill (W07).

### Fase 2
- **Unitarios:** matemática de cuotas del RPC; idempotencia (mismo request id).
- **Integración:** e2e pre-sales: doble POST mismo `checkout_request_id` → 1 venta; retry tras fallo parcial → sin duplicado; fallo de cuotas → rollback total.
- **DB:** transacción (sin `sale` huérfana si fallan items); `sale_items.legacy_product_id` poblado (W14).
- **Manuales:** checkout real por WhatsApp con doble clic (W13).
- **Borde:** carrito multi-ítem; ítem sin match en catálogo (W12).

### Fase 3
- **Unitarios:** cálculo de cuotas único (W16); fecha de cuotas por calendario (W17).
- **Integración:** stock bajo/agotado (W15); multi-plan (W16).
- **Manuales:** móvil con bloqueo de popup (W21); carrito con decimales (W20).
- **Borde:** 2 ítems con `installmentCount` distintos.

### Fase 4
- **DB:** paginación de crédito (W23) con volúmenes; agregados de dashboard (W30).
- **Integración:** import de cartera con mapeo corregido (W22) y clientes homónimos (W24).
- **Manuales:** admin de crédito, dashboard.

### Fase 5
- **Unitarios/DB:** índice realmente usado (W31); contrato runtime (W32); sort por cliente (W18).
- **Manuales:** smoke de admin; revisión manual de venta `300` (W35).

### Fase 6
- **Unitarios/Integración:** suite completa reorientada (W34); borrado de código sin callers (W33).
- **Manuales:** regresión completa de checkout, admin, crédito, auth; lint/build en CI.
- **Borde:** verificación por grep de que el código eliminado no tiene imports.

---

## 7. Código muerto (sección exclusiva)

| Archivo | Función/Objeto | Motivo | Dependencias | Impacto al eliminarlo |
|---------|----------------|--------|--------------|-----------------------|
| `app/api/sales/route.ts` | Ruta POST | Cadena RPC abandonada (B/T18) | Ninguna en runtime (grep 0 callers) | Bajo; libera ruta `/api/sales` |
| `lib/services/checkoutSaleClient.ts` | Cliente checkout | Ídem | Ninguna | Bajo |
| `lib/services/checkoutSaleService.ts` | Servicio checkout (llama `getProducts()` completo) | Ídem (A/P6) | Ninguna | Bajo; además elimina el problema de rendimiento A/P6 |
| `lib/repositories/saleRepository.ts:321-342` | `createCheckoutSaleTransaction` | Ídem | Ninguna | Bajo |
| `lib/repositories/saleRepository.ts` | `isValidCheckoutSaleInput`, `assertValidCheckoutInput` | Ídem | Ninguna | Bajo |
| `lib/supabase/types` | Tipos `CheckoutSale*` | Ídem | Tests (T20) | Bajo |
| RPC `create_checkout_sale` (prod) | Función SQL | Único flujo candidato a revivir (W33*/W10); hoy solo lo usan tests (T18/T20); conserva bug C1 | Tests | **Decisión:** si se elimina, migración `drop function` + reescribir tests (W34) |
| RPC `apply_credit_payment` | Función SQL | Nunca dropeado (B/T3) | Ninguna | Bajo; migración `drop function` |
| `components/BannerCarousel` | Componente | Sin imports (A) | Ninguna | Bajo |
| `products.archived_at` | Columna | Ninguna query la usa (B/T6) | — | Bajo; limpieza de esquema |
| `sale_items.product_id` FK | Columna | Sin uso real en queries de detalle (B/T7) | — | Bajo; revisar antes de dropear (W38) |
| `findSaleByCheckoutRequestId` | Función | Vivo parcial: solo lo usa el recovery 23505 de `createSale` (C §6) | `createSale` | **NO eliminar** — base de W11/W10 |

---

## 8. Migraciones futuras (solo listado, sin escribir SQL)

| ID | Cambio | Motivo | Riesgo |
|----|--------|--------|--------|
| M01 | RLS `profiles`: restringir columnas actualizables / impedir cambio de `role` | W01 (A/S1) | Medio |
| M02 | Bucket `proveedor-adjuntos` privado + policies storage | W02 (A/S2 = B/C5) | Medio |
| M03 | Función + trigger `handle_new_auth_user` en migraciones | W07 (B/C3) | Alto |
| M04 | Columnas `reference_price`/`tendencias` en `products` (o drop del código) | W08 (B/C4) | Medio |
| M05 | Endurecer `insert_and_validate_pago` + revocar GRANT amplio | W09 (B/C6) | Medio |
| M06 | RPC transaccional de venta (`create_checkout_sale` corregida o nueva) | W10 (C/F1, B/T18) | Crítico |
| M07 | Ajuste de índices (duplicados/btree) tras medición | W31 (B/T1/T2) | Bajo |
| M08 | Precisión `numeric`, enum `payment_method`, enum `credit_installments.status` | W38 (B/T8/T9/T10) | Bajo |
| M09 | Actualizar `validate_runtime_contract` | W32 (B/T4) | Bajo |
| M10 | Sort por `customerName` en BD (RPC/query) | W18 (B/C7) | Bajo |
| M11 | Drop de `apply_credit_payment` y (según decisión) `create_checkout_sale` | W33 (B/T3/T18) | Medio |
| M12 | Paginación real de cuentas de crédito | W23 (B/C9) | Medio |
| M13 | Retención de `admin_audit_logs` | W38 (B/T11) | Bajo |
| M14 | Registro del sobre-pago en import | W38 (B/T12) | Bajo |

---

## 9. Deuda técnica (reclasificación T18–T32 y referencia T1–T17)

**Decisión** = Eliminar · Mantener · Fusionar · Postergar.

| ID | Deuda | Decisión | Acción |
|----|-------|----------|--------|
| T18 | Cadena de checkout RPC abandonada (RPC con bug en prod) | **Fusionar** | Fusionar con T19/T20/T21 → decisión W33* y tarea W10/W33 |
| T19 | `/api/pre-sales` sin protecciones | **Fusionar** | Fusionar con T23/T25 → W03 + W12 |
| T20 | Tests DB apuntados a funcionalidad abandonada | **Fusionar** | Fusionar con T18 → W34 (según decisión W33*) |
| T21 | Creación de venta sin transacción | **Mantener** | W10 (Fase 2) |
| T22 | Sin idempotencia end-to-end | **Mantener** | W11 + W13 (Fase 2) |
| T23 | Montos confiados al cliente | **Mantener** | W12 (Fase 0) |
| T24 | Sin lock en botón de checkout | **Mantener** | W13 (Fase 2) |
| T25 | Endpoint sin rate-limit/control | **Mantener** | W03 (Fase 0) |
| T26 | `sale_items` sin referencia a producto (confirmado en D) | **Mantener** | W14 (Fase 2) |
| T27 | Fuga de `error.message` | **Mantener** | W05 (Fase 1) |
| T28 | Sin política de stock | **Mantener** | W15 (Fase 3) |
| T29 | Cuotas con fuentes de verdad distintas | **Mantener** | W16 (Fase 3) |
| T30 | Recursión en `findOrCreateCustomer` | **Mantener** | W19 (Fase 3) |
| T31 | Precio vía `parseInt` de formatos | **Mantener** | W20 (Fase 3) |
| T32 | Popup WhatsApp + `clearCart` incondicional | **Mantener** | W21 (Fase 3) |
| T1/T2 | Índices duplicados/btree inservibles | **Postergar** | W31 tras medición (Fase 5) |
| T3 | RPC `apply_credit_payment` muerto | **Eliminar** | W33 (Fase 6) |
| T4 | `validate_runtime_contract` desactualizado | **Mantener** | W32 (Fase 5) |
| T5 | `schema.sql` inservible | **Fusionar** | Fusionar con C2 → W06 (Fase 1) |
| T6 | `products.archived_at` huérfana | **Eliminar** | W38 (Fase 6) |
| T7 | `sale_items.product_id` FK sin uso real | **Eliminar** (revisar) | W38 (Fase 6) |
| T8/T9/T10 | Precisión/enums | **Mantener** | W38 (Fase 6) |
| T11 | `admin_audit_logs` sin retención | **Postergar** | W38 (Fase 6) |
| T12 | Sobre-pago sin registro | **Mantener** | W38 (Fase 6) |
| T13 | Logging de PII (C13) | **Fusionar** | Fusionar con W05/T27 (errores/logs) |
| T14 | Cargas completas en memoria | **Fusionar** | Fusionar con W23/W30 (paginación) |
| T15 | README de migraciones parcial | **Mantener** | W37 (Fase 6) |
| T16 | `mainCustomer = customers[0]` | **Mantener** | W38 (Fase 6) |
| T17 | `enable_signup` local | **Postergar** | W38 (Fase 6) |

---

## 10. Qué NO tocar (actualizado con evidencia de Etapa D)

- **RLS default-deny** en tablas transaccionales sin policies (`sales`, `sale_items`, `installments`, `customers`) — D confirmó integridad (D6/D10/D11) y la protección anónima funciona. **No** abrir policies "por comodidad".
- **CHECKs de dinero/cantidad** (`>= 0`, `quantity > 0`, `paid + remaining = original`) — D4/D12/D13 los respetaron en los datos reales.
- **FKs**: `ON DELETE CASCADE` en `sale_items`/`installments` (D10/D11 sin huérfanos; son la base de la compensación de F1) y `ON DELETE RESTRICT` en `customers`/`payments`.
- **UNIQUEs**: `sale_number`, `checkout_request_id`, `installments(sale_id, installment_number)` — D6 sin duplicados.
- **Recovery 23505 en `createSale`** (`saleRepository.ts:363-382`) — es la base de la idempotencia (W11/W10).
- **`findOrCreateCustomer` normalización** (trim/email-lower) — D9: 0 clientes duplicados por phone/email/dni.
- **Índices únicos parciales** `phone`, `email(lower)`, `payment_request_id` — D9/D11 consistentes.
- **GRANT column-level en `profiles` (`202608030001`)** — hardening correcto documentado en B.1; no revertir (sí verificar si ya cierra W01).
- **Escapado de `%`/`,` en ILIKE admin** — sin inyección.
- **Precios almacenados** — D2: los 2 precios coinciden con el catálogo; **no** "corregir" montos existentes.
- **Los 2 registros de venta existentes** (incluida la venta `300`) — cualquier acción es revisión manual W35 con backup y aprobación, **no** una corrección automática.
- **Diseño best-effort del checkout por WhatsApp** (registro fallido + continuar igual) — es una decisión de negocio; cambiarla solo dentro de W03 (control) sin romper el flujo comercial.

---

## 11. Cronograma estimado

| Fase | Objetivo | Horas (esfuerzo) | Días (calendario, 1 dev) | Complejidad |
|------|----------|-------------------|--------------------------|-------------|
| 0 | Seguridad e integridad | 24–36 | 5–6 | Media |
| 1 | Reproducibilidad y vectores | 42–58 | 7–10 | Media-Alta |
| 2 | Núcleo de ventas | 38–54 | 6–8 | **Alta** |
| 3 | Consistencia de ventas | 26–40 | 6–8 | Media |
| 4 | Crédito e importación | 23–35 | 5–7 | Media |
| 5 | Limpieza técnica | 20–29 | 4–6 | Baja-Media |
| 6 | Refactor y cierre | 40–64 | 8–12 | Media |
| **Total** | | **213–316 h** | **~9 semanas** | Media-Alta |

**Notas:** Fases 3–6 pueden solaparse con 2+ desarrolladores (→ 5–6 semanas). Cada fase termina con `npm run lint` + `npm run build` + smoke manual (criterio heredado de Etapa A §13).

---

## 12. Conclusión

- **¿Cuál es el primer cambio que debe hacerse?** **W01** (cerrar la escalada de rol ADMIN en RLS `profiles`, A/S1) — precedido de 30 min de verificación de si `202608030001` ya la mitiga; en paralelo, ese mismo día, **W12** (validación server-side de precios, C/F2), que no requiere migración.
- **¿Cuál es el cambio más riesgoso?** **W10** (creación de venta transaccional / reactivar la RPC corregida): toca el único flujo vivo de ventas, combina la decisión T18 y depende de W12/W11. Le sigue **W07** (trigger de alta de perfiles) por el flujo de auth.
- **¿Cuál aporta más valor al negocio?** El **núcleo de ventas (Fase 2: W10/W11/W14)**: convierte el registro de ventas en una fuente confiable — es la base de la cobranza y del módulo de crédito. Dentro de ella, **W12** (Fase 0) es el habilitador: sin montos confiables, nada de lo que sigue es medible.
- **¿Cuál puede esperar?** La **Fase 6 completa** (W27/W28/W29/W37/W38) y **W31** (índices): no tienen impacto funcional ni de seguridad inmediato.
- **¿Cuál es el orden óptimo de implementación?** **Fase 0 → Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6**, respetando el grafo de §3: seguridad e integridad primero (0), reproducibilidad y vectores (1), luego el núcleo de ventas (2), su consistencia (3), crédito/import (4), limpieza (5) y refactor final (6). Cualquier tarea sin dependencias (W13, W19, W26) puede adelantarse en paralelo sin cambiar el orden de las fases.

---

*Plan maestro generado en modo read-only. No se modificó código, SQL ni migraciones. Todo cambio propuesto deriva de hallazgos documentados en Etapas A–D; los resultados de Etapa D (sin corrupción, F7 materializado, muestra mínima) se respetan tal cual.*
