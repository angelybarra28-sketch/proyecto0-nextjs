# ElectroBlancos — Ecommerce

Ecommerce textil con Next.js App Router, Supabase backend y panel admin completo.

## Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript
- **Backend:** Supabase (PostgreSQL, RLS, RPCs)
- **Estilos:** CSS Modules, tema oscuro
- **Estado:** React Context (carrito, auth)

## Instalación

```bash
npm install
npm run dev
```

Variables de entorno requeridas (`.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Estructura

```
app/                  ← App Router (páginas y API routes)
  /producto/[slug]    ← Página de producto (SEO)
  /categoria/[slug]   ← Página de categoría
  /admin              ← Panel admin (client-only)
  /api/               ← API routes (productos, ventas, crédito, etc.)
components/           ← Componentes React
lib/                  ← Lógica de negocio, tipos, servicios
  /repositories/      ← Acceso a datos (Supabase)
  /services/          ← Servicios de catálogo, admin, etc.
  /adapters/          ← Adaptadores de datos
  /supabase/          ← Cliente Supabase
types/                ← Modelos de dominio financiero
supabase/             ← Migraciones SQL y schema
docs/                 ← Documentación completa
```

## Comandos

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | Linter |
| `npm run check:runtime` | Verificar runtime de Supabase |
| `npm run verify:production` | Verificación pre-deploy |
| `npm run maintenance:on` | Modo mantenimiento |
| `npm run maintenance:off` | Salir de modo mantenimiento |

## Documentación

Ver `docs/reference/indice-documentacion.md` para el índice completo.

### Rutas rápidas

- **Sistema de filtros:** `docs/architecture/filter-system.md`
- **Panel admin:** `app/admin/`
- **Migración a slugs:** `docs/architecture/MIGRACION_SLUGS.md`
- **Auditorías de crédito:** `docs/audits/`
- **Checklist de producción:** `docs/guides/OPERATIONS_CHECKLIST.md`
- **Notas para AI agents:** `docs/reference/AGENTS.md`

## Funcionalidades principales

- Catálogo de productos con slugs SEO-friendly
- Búsqueda y filtros por categoría, precio, descuento, stock
- Carrito de compras con persistencia localStorage
- Checkout vía WhatsApp
- Autenticación (registro/login)
- Panel admin: CRUD de productos, gestión de ventas, dashboard
- Módulo de crédito: cuentas corrientes, cobranzas, control mensual
- Integración Supabase con híbrido localStorage fallback
