# Supabase Migrations

Estas migraciones versionadas separan el contrato productivo por área. `supabase/schema.sql` es un **snapshot auto-generado** a partir de estas migraciones (ver abajo), no se edita a mano: los cambios nuevos deben agregarse como migraciones incrementales y luego regenerar el snapshot.

Orden sugerido para un entorno nuevo:

1. `202605260001_enums.sql`
2. `202605260002_tables.sql`
3. `202605260003_indexes.sql`
4. `202605260004_rls.sql`
5. `202605260005_rpcs.sql`
6. `202605260006_storage_contract.sql`
7. `202605260007_runtime_contract.sql`

Para entornos existentes, todas las migraciones usan `if not exists`, `create or replace` o `alter table ... add column if not exists` donde corresponde.

## Snapshot `supabase/schema.sql`

- Generado por `npm run schema:generate` → `scripts/generate-schema-snapshot.mjs`.
- Concatenación fiel (en orden de aplicación) de los 40 archivos de `migrations/`.
- Aplicarlo a un proyecto Supabase nuevo reproduce el estado exacto de todas las migraciones (equivalente a `supabase db reset`), incluido el alta automática de perfiles (`handle_new_auth_user` + trigger `on_auth_user_created`, migración `202608060001`).
- El snapshot anterior (manuscrito Fase 1 + parches) quedó respaldado en `supabase/schema.sql.backup-fase1`.
