import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const schema = readFileSync(new URL('../../supabase/schema.sql', import.meta.url), 'utf8');
const migration = readFileSync(
  new URL('../../supabase/migrations/202608060002_products_reference_price_tendencias.sql', import.meta.url),
  'utf8',
);

test('products.reference_price and products.tendencias are part of the migrations snapshot', () => {
  assert.match(schema, /alter table products\s+add column if not exists reference_price numeric\(12,2\),\s+add column if not exists tendencias boolean not null default false/s);
  assert.match(schema, /comment on column products\.reference_price/);
  assert.match(schema, /comment on column products\.tendencias/);
});

test('migration is idempotent (add column if not exists) and safe over an existing DB', () => {
  assert.match(migration, /add column if not exists reference_price numeric\(12,2\)/);
  assert.match(migration, /add column if not exists tendencias boolean not null default false/);
  assert.ok((migration.match(/add column if not exists/g) || []).length >= 2);
  assert.ok(!/drop\s+column|alter\s+column\s+drop/i.test(migration));
});
