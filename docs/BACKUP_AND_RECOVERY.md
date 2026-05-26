# Backup And Recovery

This project uses Supabase/Postgres for operational data and Supabase Storage for product images. There is no separate backend persistence layer.

## What To Back Up

- Postgres database: schema, migrations state, catalog, customers, sales, installments, payments, payment allocations, profiles, and audit logs.
- Supabase Storage: `product-images` bucket, or the bucket configured by `SUPABASE_PRODUCT_IMAGES_BUCKET`.
- Environment variables: production values for Supabase URL, anon key, service-role key, site URL, bucket name, and operational flags.
- Application artifact: deployed commit SHA and build output reference from the hosting provider.

## Recommended Frequency

- Database: daily automated snapshot minimum; increase to hourly before high-sales periods or major admin operations.
- Storage: daily object inventory/export minimum; run an on-demand backup before bulk image changes.
- Environment variables: after every configuration change; keep an encrypted copy in the approved secrets manager.
- Migrations: every deploy through git history and Supabase migration history.

## Database Backup

Use Supabase dashboard backups when available. For manual backups, use `pg_dump` from a trusted machine with production credentials:

```bash
pg_dump "$DATABASE_URL" --format=custom --file=backup.dump
```

Keep backups encrypted at rest and restrict access to operators who can already access production data.

## Storage Backup

Export or sync the configured product image bucket:

```bash
supabase storage cp --recursive "ss://product-images" "./backup/product-images"
```

If using another bucket name, replace `product-images` with `SUPABASE_PRODUCT_IMAGES_BUCKET`.

## Environment Backup

Record these values securely:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_PRODUCT_IMAGES_BUCKET`
- `MAINTENANCE_MODE`

Never commit real secret values to the repository.

## Maintenance Mode

Set `MAINTENANCE_MODE=true` to block financial writes while keeping public catalog browsing and admin reads available.

Blocked while active:

- `POST /api/sales`
- `POST /api/admin/sales/[id]/payments`

Allowed while active:

- Public ecommerce pages and catalog reads
- Admin pages and read APIs
- `GET /api/health`
- `GET /api/ready`
- `GET /api/ready/recovery`
- Dashboard reads

Blocked APIs return `MAINTENANCE_MODE_ACTIVE` with HTTP 503.

## Partial Restore

Use partial restore only when the affected scope is clear.

- Catalog-only issue: restore affected `products`, `categories`, and related image objects.
- Image-only issue: restore missing objects to the bucket, then run `npm run maintenance:check-storage`.
- Payment/sale issue: do not manually patch without reconciling `sales`, `installments`, `payments`, and `payment_allocations` together.

After a partial restore, run:

```bash
npm run maintenance:runtime-contract
npm run maintenance:check-storage
npm run maintenance:analytics-refresh
```

## Total Restore

1. Set `MAINTENANCE_MODE=true`.
2. Stop deploys and pause admin financial operations.
3. Restore Postgres from the selected backup.
4. Restore the Storage bucket snapshot.
5. Reapply missing migrations only if the restored backup predates deployed code.
6. Verify environment variables match the restored project.
7. Run recovery validation.
8. Set `MAINTENANCE_MODE=false` only after checks pass.

## Operational Rollback

If a deploy is suspected to be unsafe:

1. Set `MAINTENANCE_MODE=true` if financial writes may be affected.
2. Roll back the app deployment to the previous known-good commit.
3. Do not roll back database migrations unless a restore plan has been approved.
4. Run `npm run verify:production` with production env configured.
5. Run `GET /api/ready/recovery`.
6. Disable maintenance mode after financial and storage checks pass.

## Post-Restore Validation

Run these checks after any restore:

```bash
npm run verify:production
npm run maintenance:runtime-contract
npm run maintenance:check-storage
npm run maintenance:analytics-refresh
```

Also verify:

- `GET /api/health` returns 200.
- `GET /api/ready` returns 200.
- `GET /api/ready/recovery` returns 200.
- Admin dashboard loads.
- Catalog product detail pages load.
- A test checkout is only performed after maintenance mode is disabled and operators approve financial writes.

## Known Risks

- Storage consistency checks only report inconsistencies; they do not delete or repair objects automatically.
- Recovery readiness writes a temporary audit-log row and temporary Storage object, then deletes both.
- Local verification may fail without production/test Supabase environment variables.
- Database restores can invalidate app assumptions if migrations and deployed code are not aligned.
- Payment and installment data must be restored as a consistent set.
