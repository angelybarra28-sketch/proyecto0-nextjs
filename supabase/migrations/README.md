# Supabase Migrations

Estas migraciones versionadas separan el contrato productivo por área. `supabase/schema.sql` queda como snapshot completo de compatibilidad, pero los cambios nuevos deben agregarse como migraciones incrementales.

Orden sugerido para un entorno nuevo:

1. `202605260001_enums.sql`
2. `202605260002_tables.sql`
3. `202605260003_indexes.sql`
4. `202605260004_rls.sql`
5. `202605260005_rpcs.sql`
6. `202605260006_storage_contract.sql`
7. `202605260007_runtime_contract.sql`

Para entornos existentes, todas las migraciones usan `if not exists`, `create or replace` o `alter table ... add column if not exists` donde corresponde.
