# Auditoría Técnica Pre-Producción — ElectroBlancos ERP (proyecto0-nextjs)

**Alcance:** Auditoría técnica read-only (sin modificación de código) del sistema completo antes de producción.
**Fecha:** Agosto 2026
**Método:** Exploración del código + agentes de auditoría + verificación manual de cada hallazgo crítico leyendo el archivo real.

## Datos de la auditoría

- **502 archivos** versionados en git (solo TS/JS/etc.; sin `node_modules` ni `venv`).
- **62 rutas API admin** bajo `app/api/admin/**`.
- **31 migraciones SQL** en `supabase/migrations/` (algunas no documentadas).
- **23 tablas**, **19 RPCs** en Supabase.
- **Lint:** `npm run lint` → `✖ 108 problems (68 errors, 40 warnings), 4 fixable`.
- Arquitectura híbrida en transición: catálogo hardcodeado (`lib/products.ts`) + Supabase (backend parcial).

---

## 1. Arquitectura

### Puntos fuertes
- Next.js App Router limpio, sin `src/`; rutas claras: `app/producto/[slug]` (SEO), `app/categoria/[categoria]`, `app/checkout` (WhatsApp, no pagos), `app/admin`.
- Path alias `@/*` → raíz del repo (ver `tsconfig.json`).
- Separación razonable: `lib/repositories` (acceso a datos), `lib/services/admin` (servicios nuevos), `components/Admin`, `proxy.ts` (middleware).

### Problemas
1. **Dos generaciones de servicios conviven:** `lib/services/*.ts` (viejas, raíz) y `lib/services/admin/*` (nuevas). Riesgo de divergencia y lógica duplicada.
2. **Dos "mundos" de tipos:** `lib/types.ts` (ecommerce) y `types/` (modelos financieros: `Customer`, `Sale`, `Payment`, `Installment`, enums). Los tipos financieros **no están conectados al sistema en ejecución**.
3. **Estado global en `localStorage`:** cart (`lib/cartContext.tsx`) y auth (`lib/authContext.tsx`). Sin backend de sesión.
4. **Sin API routes propias para catálogo:** los datos de producto son código estático; el "backend" real es Supabase directo desde el cliente/middleware.

**Veredicto:** arquitectura razonable para el estado actual, con deuda de transición (tipos/servicios duplicados, catálogo estático).

---

## 2. Base de Datos

### Datos
- 23 tablas, 31 migraciones, 19 RPCs.
- Módulo de crédito: `credit_accounts.is_active` es **flag manual de visibilidad**, no estado financiero (derivado de `credit_installments.remaining_amount`). Documentado en AGENTS.md.

### Problemas
1. **`supabase/schema.sql` NO es un snapshot completo:** falla en la línea ~1204 al aplicarse sobre una DB vacía (B2). Es peligroso usarlo como fuente de verdad.
2. **Columnas fantasma:** `reference_price` y `tendencias` aparecen en código pero tienen **0 definiciones** en `supabase/` (verificado con grep). Mismatch código ↔ esquema.
3. **Migraciones sin documentar:** 31 migraciones, algunas sin entrada en docs/índice.
4. **Índices:** hallazgos por patrón de código (joins/filtros frecuentes); **pendiente verificar con EXPLAIN** — no hay BD local activa.

---

## 3. Rendimiento

1. **P2 — `lib/services/admin/smart-dashboard.ts`:** 11+ consultas por request y agregados calculados en JavaScript (deberían ser SQL agregados).
2. **P4 — `components/Admin/useCreditAccounts.ts`:** `ALL_PAGE_SIZE = 100000` (paginación deshabilitada de facto).
3. **P6 — `lib/services/checkoutSaleService.ts`:** llama `getProducts()` (catálogo completo) por cada venta.
4. **Caché rota:** `lib/services/admin/maintenance.ts` ~líneas 604-605 usa `revalidateTag('admin-dashboard-analytics', 'default')` con **2 argumentos** (firma incorrecta → la caché no funciona como se espera).
5. **62 rutas API admin** sin estrategia uniforme de caché/paginación.

---

## 4. Frontend

1. **`app/admin/ventas/nueva/page.tsx`:** **1.278 líneas**, estilos inline repetidos, y link roto a `/admin/cuentas-corrientes`.
2. **Lint:** 68 errores / 40 warnings; conocidos: `react-hooks/set-state-in-effect` (cartContext, authContext, useProductSearch, admin/page), `react/no-unescaped-entities` (SearchBar, categoria), `no-explicit-any` y `no-html-link-for-pages` (admin/page).
3. **Dead code:** `BannerCarousel` sin imports.
4. **`components/Layout/Header.tsx`:** puede ser detectado como "binary" por readers (caracteres no-ASCII); leer con `Get-Content -Raw` si falla.

---

## 5. APIs

1. **S3 — `/api/pre-sales` (POST) sin auth:** escribe con service-role. Punto de escritura sin verificación.
2. **S15 — `/api/admin/backup/restore` + `restore.service.ts`:** replace destructivo **sin transaccionalidad** ni límite de tamaño. (Nota: `validate.service.ts` sí es robusto: 7 reglas + 19 FKs antes del restore.)
3. **S9 — `lib/server/apiErrors.ts`:** fuga de `error.message` crudo al cliente (detalle interno expuesto).
4. **`/api/ready/recovery`:** flujo de recuperación que verificar en conjunto con la auth de service-role.

---

## 6. Seguridad

> Calificación más baja de la auditoría: **3/10**.

1. **S1 (CRÍTICO) — Escalada de rol ADMIN vía RLS:** la política "Users can update own basic profile" en `supabase/migrations/202605260004_rls.sql` permite a un usuario actualizar su propio `profiles` sin restringir qué columnas, permitiendo elevar `role` a ADMIN.
2. **S2 (CRÍTICO) — Bucket público:** `supabase/migrations/202607230002_create_proveedor_adjuntos_bucket.sql` crea el bucket `proveedor-adjuntos` como **público**.
3. **S3 (CRÍTICO) — Endpoints sin auth:** `/api/pre-sales` (y revisar `actions`/`ready`) escriben con service-role sin validar identidad.
4. **S15 (ALTO) — Restore destructivo** sin transaccionalidad ni límite de tamaño.
5. **S9 (MEDIO) — Fuga de errores internos** al cliente.
6. **Positivo:** `.env*` correctamente ignorado en `.gitignore`; `git ls-files` no incluye node_modules/venv/secretos; hay un `proxy.ts` (middleware) que actúa como capa de protección.

---

## 7. Código

1. **Duplicación:** servicios viejos (`lib/services/*.ts`) vs nuevos (`lib/services/admin/`).
2. **God objects:** `lib/services/admin/maintenance.ts` (~618 líneas, múltiples responsabilidades + caché rota).
3. **Tipos financieros huérfanos:** `types/` no wired al runtime.
4. **Dead code:** `BannerCarousel`.
5. **Calidad dispareja:** hay módulos bien construidos (backups con validación previa) junto a páginas de 1.278 líneas con estilos inline.

---

## 8. Módulos de Mantenimiento

8 módulos relevantes (read-only):
- **Backups/Papelera/Historial de Precios** (commit `60c034a`): sistema completo; `validate.service.ts` robusto (7 reglas + 19 FK), pero `restore.service.ts` no es transaccional.
- **Notificaciones** (`notifications.ts`): calculadas on-the-fly, **no persistidas**.
- **Auditoría** (`auditService.ts`): registro de auditoría presente.
- **Smart Dashboard** (`smart-dashboard.ts`): correcto funcionalmente, pesado (11+ consultas/request).
- **Configuración / Clientes / Créditos:** presentes en `components/Admin/Pages/`.
- **Créditos** (`useCreditAccounts.ts`): paginación deshabilitada (`ALL_PAGE_SIZE = 100000`).

---

## 9. UX Admin

1. **Accesibilidad (A11y):** hallazgos pendientes de resolver (sin revisión sistemática de roles/aria).
2. **`app/admin/ventas/nueva/page.tsx`:** 1.278 líneas, estilos inline repetidos, link roto.
3. **Admin y auth son client-only** (`app/admin/page.tsx`, `app/auth/page.tsx`): todo el peso cae en el cliente; no hay SSR.
4. **Consistencia visual:** estilos inline duplicados en varias páginas de admin.

---

## 10. Escalabilidad

1. Estado en `localStorage` (sin server-side).
2. Agregados en JS en vez de SQL (`smart-dashboard`).
3. Sin paginación real en listados (`ALL_PAGE_SIZE = 100000`).
4. Catálogo estático hardcodeado (escala mal al crecer el inventario).
5. Índices pendientes de validar con EXPLAIN.
6. 62 rutas API sin estrategia uniforme de caché.

---

## 11. Calificaciones (1-10)

| Área | Nota |
|------|------|
| Arquitectura | **5** |
| Código | **4** |
| Base de datos | **5** |
| Frontend | **5** |
| UX | **5** |
| Seguridad | **3** |
| Escalabilidad | **4** |
| Rendimiento | **5** |
| Mantenibilidad | **4** |
| **Calidad general** | **4** |

---

## 12. Roadmap Priorizado

### Etapa A — Seguridad (URGENTE, antes de producción)
| Item | Hallazgo | Severidad |
|------|----------|-----------|
| M1 | RLS `profiles`: restringir columnas actualizables, prohibir cambio de `role` | CRÍTICO (S1) |
| M2 | Bucket `proveedor-adjuntos`: pasar a privado + signed URLs | CRÍTICO (S2) |
| M3 | Auth en `/api/pre-sales`, `actions`, `ready` | CRÍTICO (S3) |
| M4 | Restore transaccional + límite de tamaño | ALTO (S15) |
| M5 | `apiErrors`: no filtrar `error.message` crudo | MEDIO (S9) |
| M6 | Revisar permisos service-role / RLS completa | ALTO |
| M7 | `proxy.ts`: reforzar y cubrir las rutas nuevas | MEDIO |

### Etapa B — Base de datos
- Generar snapshot real de esquema; arreglar o deprecar `supabase/schema.sql` (B2).
- Crear migración para columnas `reference_price`/`tendencias` o eliminar del código (mismatch).
- Validar índices con EXPLAIN; documentar las 31 migraciones.

### Etapa C — Rendimiento
- `smart-dashboard`: mover agregados a SQL/RPC.
- Paginación real en listados de admin (reemplazar `ALL_PAGE_SIZE`).
- `checkoutSaleService`: evitar `getProducts()` completo por venta.
- Arreglar `revalidateTag` (firma de 1 argumento) en `maintenance.ts`.

### Etapa D — Frontend/UX
- Refactorizar `app/admin/ventas/nueva/page.tsx` (1.278 líneas → componentes).
- Arreglar link roto a `/admin/cuentas-corrientes`.
- Resolver los 68 errores de lint.

### Etapa E — Refactor de código
- Unificar `lib/services` (viejas vs `admin`).
- Conectar tipos financieros de `types/` o deprecarlos.
- Eliminar dead code (`BannerCarousel`).
- Dividir god objects (`maintenance.ts`).

---

## 13. Plan por Etapas

**Etapa A (Seguridad, M1–M7):** empieza por M1 (RLS profiles) → M2 (bucket) → M3 (auth pre-sales/actions/ready) → M4 (restore) → M5 (errores) → M6 (revisión RLS/service-role) → M7 (proxy). Verificar cada migración contra las 31 existentes.

**Etapa B (BD):** snapshot real del esquema, migración de columnas faltantes, EXPLAIN + índices, documentación de migraciones.

**Etapa C (Rendimiento):** agregados SQL, paginación, evitar catálogo completo, caché correcta.

**Etapa D (Frontend/UX):** refactor de la página de ventas, accesibilidad admin, lint a 0.

**Etapa E (Código):** unificar servicios, conectar/deprecar tipos, borrar dead code, dividir god objects.

> **Nota:** cada Etapa debe validarse con `npm run lint`, `npm run build` y pruebas manuales del flujo de checkout/créditos antes de seguir.
