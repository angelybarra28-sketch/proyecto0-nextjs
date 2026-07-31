-- ETAPA 13: Historial de precios de productos.
-- Tabla dedicada (no se reutiliza admin_audit_logs para el historial).

create table if not exists product_price_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  old_price numeric(10,2) not null,
  new_price numeric(10,2) not null,
  changed_by uuid null references auth.users(id) on delete set null,
  reason text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_price_history_product_id
  on product_price_history (product_id);

create index if not exists idx_product_price_history_created_at
  on product_price_history (created_at desc);

comment on table product_price_history is
  'Historial de cambios de precio de productos. Registra un cambio por modificacion real de precio.';

comment on column product_price_history.old_price is 'Precio anterior al cambio.';
comment on column product_price_history.new_price is 'Precio nuevo despues del cambio.';
comment on column product_price_history.reason is 'Motivo opcional indicado por el administrador.';

-- RLS: solo lectura para ADMIN/STAFF; el resto del acceso es via service-role.
alter table product_price_history enable row level security;

drop policy if exists "Admin can read product_price_history" on product_price_history;

create policy "Admin can read product_price_history"
  on product_price_history for select
  using (exists (
    select 1 from profiles
    where user_id = auth.uid()
      and role in ('ADMIN', 'STAFF')
      and is_active = true
  ));
