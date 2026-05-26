# Operaciones Financieras Críticas

## Operaciones Atómicas
- `create_checkout_sale`: crea cliente, venta, items y cuotas dentro de una RPC transaccional.
- `register_sale_payment`: registra pago, allocations, actualiza cuotas y actualiza `sales` dentro de una RPC transaccional.
- `refresh_financial_statuses`: recalcula estados vencidos y cobranza. Ya no se ejecuta en lecturas admin.

## Idempotencia
- `register_sale_payment` requiere `payment_request_id`.
- Reintentos con el mismo `payment_request_id` devuelven el pago existente.
- `checkout_request_id` mantiene idempotencia del checkout.

## Modo Híbrido Temporal
- El checkout financiero persiste `legacy_product_id` mientras el carrito público siga usando ids numéricos.
- Productos sin `legacy_product_id` estable no deben entrar al checkout persistido.
- El precio financiero se recalcula server-side desde el catálogo real.

## Service Role
- Escrituras financieras y admin usan `SUPABASE_SERVICE_ROLE_KEY` solo desde servidor.
- Las rutas públicas/client components nunca deben importar helpers de service-role.

## Jobs Futuros
- `refresh_financial_statuses`: recomendado como job programado diario o cada pocas horas.
- `refresh_dashboard_analytics`: preparado para prewarm/cache, sin cron real todavía.
- `send_payment_reminders`: reservado, sin side effects.
