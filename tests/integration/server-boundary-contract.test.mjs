import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import test from 'node:test';

const dangerousPatterns = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'getSupabaseAdminClient',
  '@/env/server',
  '../env/server',
];

test('client components and browser modules do not import service-role boundaries', () => {
  const files = [
    ...globSync('components/**/*.{ts,tsx}'),
    ...globSync('hooks/**/*.{ts,tsx}'),
    'lib/supabase/browser.ts',
    'lib/authContext.tsx',
  ];

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const isClientFile = source.includes("'use client'") || source.includes('"use client"') || file.includes('hooks/') || file.includes('browser') || file.endsWith('authContext.tsx');
    if (!isClientFile) continue;

    for (const pattern of dangerousPatterns) {
      assert.equal(source.includes(pattern), false, `${file} must not contain ${pattern}`);
    }
  }
});

test('RPC migration contains complete critical RPC definitions and revoke statements', () => {
  const migration = readFileSync('supabase/migrations/202605260005_rpcs.sql', 'utf8');
  for (const name of ['create_checkout_sale', 'register_sale_payment', 'refresh_financial_statuses', 'get_admin_dashboard_analytics', 'validate_runtime_contract']) {
    assert.match(migration, new RegExp(`create or replace function ${name}\\(`));
  }
  assert.match(migration, /revoke execute on function register_sale_payment/);
  assert.match(migration, /from anon, authenticated/);
});
