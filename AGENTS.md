# AGENTS.md (repo-specific notes)

## Quick Commands
- Install: `npm install`
- Dev server: `npm run dev` (Next.js, http://localhost:3000)
- Lint: `npm run lint` (currently fails; see “Lint Gotchas”)
- Build: `npm run build`

## Project Shape (Next.js App Router)
- App entrypoints live in `app/` (there is no `src/` directory).
- Route map (high-signal):
  - `app/page.tsx`: home page composition.
  - `app/producto/[slug]/page.tsx`: primary product detail route (SEO slug) using `generateStaticParams`.
  - `app/detalles/[id]/page.tsx`: legacy product detail route by numeric id (duplicates slug route).
  - `app/categoria/[categoria]/page.tsx`: category listing; uses `decodeURIComponent` for the segment.
  - `app/checkout/page.tsx`: “checkout” is WhatsApp handoff, not payments.
  - `app/auth/page.tsx`: client-only login/registration.
  - `app/admin/page.tsx`: client-only admin panel.

## Data Sources (No Backend)
- Product catalog is hardcoded in `lib/products.ts` (`productData`, `allProducts`).
- Product helpers (slugs, category queries, search, filters) live in `lib/product-utils.ts`.
- No API routes, DB layer, or server persistence currently.

## Global State & Persistence
- Global providers are mounted in `app/layout.tsx`:
  - `lib/cartContext.tsx`: cart stored in `localStorage` key `cart`.
  - `lib/authContext.tsx`: auth stored in `localStorage` keys `currentUser` and `users`.
- Admin page reads `localStorage` key `orders`, but the checkout flow does not write orders today.

## Types (Two Worlds)
- `lib/types.ts`: ecommerce types (Product, auth types) plus filter types (ProductFilters, etc.).
- `types/`: financial/admin domain models (`Customer`, `Sale`, `Payment`, `Installment`, enums). These are not wired into the running app yet.

## Search & Filters
- Search UI: `components/SearchBar.tsx` + hook `hooks/useProductSearch.ts`.
- Filter engine is implemented in `lib/product-utils.ts` (`filterProducts`, `getFilterOptions`, `searchProducts`, etc.) and documented in `docs/guides/README_FILTROS.md` + `docs/guides/CHEATSHEET_FILTROS.md`.

## Path Alias
- TS path alias `@/*` maps to repo root (see `tsconfig.json`), so imports like `@/lib/...` resolve to `/lib/...`.

## Lint Gotchas (Current State)
- `npm run lint` fails on:
  - `react-hooks/set-state-in-effect` in `lib/cartContext.tsx`, `lib/authContext.tsx`, `hooks/useProductSearch.ts`, `app/admin/page.tsx`.
  - `react/no-unescaped-entities` in `components/SearchBar.tsx` and `app/categoria/[categoria]/page.tsx`.
  - `@typescript-eslint/no-explicit-any` in `app/admin/page.tsx`.
  - `@next/next/no-html-link-for-pages` in `app/admin/page.tsx`.
- Expect warnings about unused vars and `<img>` vs `next/image` in a few components.

## Encoding/Tooling Quirk
- `components/Layout/Header.tsx` may be misdetected as “binary” by some file readers due to non-ASCII characters/control bytes; if a tool can’t read it, fall back to an editor or PowerShell `Get-Content -Raw`.

## Credit Module — `credit_accounts.is_active`
- `is_active` is a **manual visibility flag**, not a financial state. It controls whether an account appears in lists, dashboards, collection routes, and monthly control.
- Financial status (paid/pending/overdue) is derived from `credit_installments.remaining_amount`, not from `is_active`.
- All credit queries filter `is_active = true` **except** `get_credit_commercial_metrics` (which was aligned in Fase 4 Semana 3).
- No UI or API currently toggles `is_active`. Accounts are always inserted with `default true`.
- Changing `is_active` from `true` to `false` hides the account from all operational views but does not delete or alter financial data.

## High-Value Docs
- Slugs/routing docs index: `docs/reference/indice-documentacion.md` (starts at `docs/guides/RESUMEN_MIGRACION.md`).
- Filters docs start: `docs/guides/README_FILTROS.md` then `docs/guides/CHEATSHEET_FILTROS.md`.
