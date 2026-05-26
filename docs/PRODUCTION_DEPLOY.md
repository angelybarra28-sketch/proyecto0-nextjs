# Production Deploy

## Required Checks

Run these before deploying:

```bash
npm run lint
npm run build
npm run test:integration
npm run verify:production
```

`verify:production` runs the runtime contract gate through `npm run check:runtime`.

## Required Environment

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_PRODUCT_IMAGES_BUCKET` optional, defaults to `product-images`

## Runtime Endpoints

- `GET /api/health`: lightweight process health, version, uptime, timestamp.
- `GET /api/ready`: readiness gate for env, Supabase reachability, runtime DB contract, and product image bucket.

## Request Correlation

All `/api/*` requests receive or propagate `x-request-id` through `proxy.ts`. Critical server logs include the request id when available.

## Operational Notes

- Apply Supabase migrations before deploying the app.
- Confirm `validate_runtime_contract` passes after migrations.
- Confirm the product images bucket exists and is reachable by the service-role key.
- `SUPABASE_SERVICE_ROLE_KEY` must only be configured server-side.
