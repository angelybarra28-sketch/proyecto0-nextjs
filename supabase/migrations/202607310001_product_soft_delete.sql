-- =============================================================================
-- MIGRACIÓN: Sistema de Papelera (Soft Delete) para productos
-- Fecha: 2026-07-31
--
-- Objetivo: permitir mover productos a la papelera sin eliminarlos físicamente.
--   - deleted_at    timestamptz null : fecha en que se movió a la papelera (NULL = activo)
--   - deleted_by    uuid null        : usuario (auth.users.id) que lo movió
--   - delete_reason text null        : motivo opcional
--
-- No se elimina ninguna columna existente ni se modifican migraciones previas.
-- =============================================================================

alter table products
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null,
  add column if not exists delete_reason text;

-- Índices de soporte para los listados (activos y papelera)
create index if not exists idx_products_deleted_at
  on products (deleted_at)
  where deleted_at is null;

create index if not exists idx_products_deleted_by
  on products (deleted_by)
  where deleted_by is not null;

comment on column products.deleted_at is 'Soft delete: fecha en que el producto fue movido a la papelera. NULL = producto activo.';
comment on column products.deleted_by is 'Soft delete: usuario (auth.users.id) que movió el producto a la papelera.';
comment on column products.delete_reason is 'Soft delete: motivo opcional al mover el producto a la papelera.';
