# Checklist Operativo De Producción

## Variables Requeridas
- `NEXT_PUBLIC_SUPABASE_URL`: URL pública del proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon key pública para Auth/browser.
- `SUPABASE_SERVICE_ROLE_KEY`: service-role key solo en servidor.
- `NEXT_PUBLIC_SITE_URL`: URL pública del sitio, usada para `metadataBase`.
- `SUPABASE_PRODUCT_IMAGES_BUCKET`: opcional, default `product-images`.

## Supabase Storage
- Bucket esperado: `product-images`.
- Las imágenes de productos deben vivir bajo `products/{productId}/{filename}`.
- No usar rutas compartidas ni carpetas fuera de `products/` para imágenes de catálogo.
- El bucket debe ser público si el catálogo consume URLs públicas.

## SQL/RPC Requeridos
- Aplicar `supabase/schema.sql` completo o migraciones equivalentes.
- RPCs críticas:
  - `create_checkout_sale`
  - `register_sale_payment`
  - `refresh_financial_statuses`
  - `get_admin_dashboard_analytics`

## Extensiones Postgres
- `pgcrypto`
- `pg_trgm`

## Índices Críticos
- `idx_payments_payment_request_id_unique` para idempotencia de pagos.
- Índices de ventas por estado/fecha/cobranza.
- Índices trigram para búsqueda admin.
- Índices de installments por estado/vencimiento.

## Deploy Mínimo
- Configurar variables en Vercel/hosting antes de build.
- Aplicar SQL en Supabase antes de habilitar admin productivo.
- Crear bucket `product-images`.
- Verificar que service-role no esté expuesto en variables públicas.
- Ejecutar `npm run lint` y `npm run build` antes de publicar.
