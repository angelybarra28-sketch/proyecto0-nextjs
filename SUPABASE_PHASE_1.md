# Supabase Phase 1

## Scope
- Adds persistence for `categories`, `products`, `customers`, `sales`, and `sale_items` only.
- Does not replace `lib/products.ts` yet; the current frontend catalog, search, filters, cart, and visual checkout remain unchanged.
- Checkout now attempts to persist a real `sale` before opening WhatsApp. If Supabase env vars are missing or the API fails, WhatsApp checkout continues as before.

## Files Added
- `supabase/schema.sql`: initial schema, enums, foreign keys, indexes, and RLS notes.
- `lib/supabase/server.ts`: server-only Supabase client using `SUPABASE_SERVICE_ROLE_KEY`.
- `lib/supabase/types.ts`: phase-1 persistence types.
- `lib/adapters/cartSaleAdapter.ts`: converts current `CartItem[]` + checkout form into a sale input.
- `lib/repositories/customerRepository.ts`: customer persistence.
- `lib/repositories/saleRepository.ts`: sale and sale item persistence.
- `lib/services/checkoutSaleService.ts`: server orchestration for checkout sale creation.
- `lib/services/checkoutSaleClient.ts`: client-safe API caller with fallback.
- `app/api/sales/route.ts`: API boundary used by checkout.

## Required Environment
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. Writes go through `app/api/sales/route.ts`.

## Migration Strategy
- Keep `localStorage.cart` as-is for now.
- Keep `lib/products.ts` and `allProducts` as the active catalog source for current UI.
- Use `sale_items.legacy_product_id` to preserve the current numeric product id until `products` is fully migrated.
- Use snapshot columns in `sale_items` so historical sales are not affected by future catalog edits.
