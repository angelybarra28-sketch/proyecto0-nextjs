-- W07 (B/C3): incorporar a las migraciones el alta automática de perfiles.
--
-- Problema: handle_new_auth_user() + trigger on_auth_user_created sobre
-- auth.users existían solo en supabase/schema.sql (snapshot manual de Fase 1),
-- nunca en las migraciones versionadas. Un proyecto reconstruido solo con
-- migraciones quedaba sin alta automática de profiles: signUp creaba la fila en
-- auth.users pero ningún profile, y el login posterior devolvía "Cuenta
-- desactivada" (lib/authContext.tsx).
--
-- Estrategia:
--   1. Función idéntica a la definición histórica probada (schema.sql backup).
--      SECURITY DEFINER: profiles tiene RLS sin policy de INSERT y sin grants de
--      INSERT para anon/authenticated (ver 202608030001); el INSERT solo puede
--      ocurrir como owner de la tabla, atravesando RLS.
--   2. Trigger drop-if-exists + create: seguro ante doble ejecución y sobre una
--      base donde ya exista (se re-apunta al objeto actual, sin duplicarlo).
--   3. Backfill idempotente para auth.users huérfanos (sin fila en profiles):
--      anti-join + on conflict do nothing => re-ejecutable, sin duplicados.
--
-- Compatibilidad: no toca RLS, policies, grants, roles, storage ni otras
-- funciones. No modifica migraciones existentes.

create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (user_id, role, full_name)
  values (
    new.id,
    'CUSTOMER',
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- Backfill idempotente: perfiles para auth.users existentes sin profile.
-- En una DB nueva no inserta nada. Re-ejecutable sin riesgo de duplicados.
insert into profiles (user_id, role, full_name, is_active)
select
  u.id,
  'CUSTOMER',
  coalesce(u.raw_user_meta_data->>'full_name', u.email),
  true
from auth.users u
left join profiles p on p.user_id = u.id
where p.user_id is null
on conflict (user_id) do nothing;
