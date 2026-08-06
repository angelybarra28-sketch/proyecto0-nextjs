-- W08 (B/C4): alinear products.reference_price y products.tendencias con el esquema.
--
-- Problema: la app usa `products.reference_price` y `products.tendencias` en
-- lectura y escritura (catálogo admin, secciones "Tendencias" del home,
-- importador de URLs, formulario de producto) pero no existían en ningún DDL
-- versionado (migraciones ni schema.sql): eran columnas creadas a mano en la
-- base real y nunca migradas (ver ETAPA_B C4).
--
-- Estrategia (Opción A): las columnas son necesarias y tienen callers vivos;
-- se incorporan al DDL oficial con el mismo patrón idempotente usado en
-- 202607310001 (add column if not exists), de modo que es seguro ejecutar esta
-- migración sobre una base donde las columnas ya existan (prod).
--
-- Tipos elegidos según el código:
--   * reference_price numeric(12,2) NULL        -> catalogAdapter: number | null
--   * tendencias      boolean NOT NULL default false -> lib/types.ts: boolean
--                                                  (adapter usa `?? false`)
--
-- No toca RLS, policies, grants, storage ni otras tablas. No modifica
-- migraciones existentes.

alter table products
  add column if not exists reference_price numeric(12,2),
  add column if not exists tendencias boolean not null default false;

comment on column products.reference_price is 'Precio de referencia opcional (normalmente el precio de lista de la fuente de importación).';
comment on column products.tendencias is 'Destaca el producto en las secciones de Tendencias del home (Hogar/Blanqueria).';
