import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const schema = readFileSync(new URL('../../supabase/schema.sql', import.meta.url), 'utf8');
const migration = readFileSync(
  new URL('../../supabase/migrations/202608060001_handle_new_auth_user.sql', import.meta.url),
  'utf8',
);

test('handle_new_auth_user is part of the official migrations snapshot', () => {
  assert.match(schema, /create or replace function handle_new_auth_user\(\)/);
  assert.match(schema, /returns trigger/);
  assert.match(schema, /security definer/);
  assert.match(schema, /set search_path = public/);
  assert.match(schema, /on conflict \(user_id\) do nothing/);
});

test('trigger on_auth_user_created fires after insert on auth.users', () => {
  assert.match(schema, /drop trigger if exists on_auth_user_created on auth\.users/);
  assert.match(schema, /create trigger on_auth_user_created/);
  assert.match(schema, /after insert on auth\.users/);
  assert.match(schema, /for each row execute function handle_new_auth_user\(\)/);
});

test('migration is safe to execute twice (no duplicate function/trigger)', () => {
  assert.match(migration, /create or replace function handle_new_auth_user\(\)/);
  assert.match(migration, /drop trigger if exists on_auth_user_created on auth\.users/);
  assert.match(migration, /create trigger on_auth_user_created/);
  assert.ok((migration.match(/create trigger on_auth_user_created/g) || []).length === 1);
  assert.ok((migration.match(/create or replace function handle_new_auth_user/g) || []).length === 1);
});

test('backfill is idempotent (anti-join + on conflict) and present in snapshot', () => {
  assert.match(schema, /insert into profiles \(user_id, role, full_name, is_active\)/);
  assert.match(schema, /from auth\.users u\s+left join profiles p on p\.user_id = u\.id\s+where p\.user_id is null\s+on conflict \(user_id\) do nothing/s);
  assert.match(migration, /from auth\.users u\s+left join profiles p on p\.user_id = u\.id\s+where p\.user_id is null\s+on conflict \(user_id\) do nothing/s);
});
