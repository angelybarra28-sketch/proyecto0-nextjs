import { createClient } from '@supabase/supabase-js';

const isTestRuntime = Boolean(process.env.TEST_SUPABASE_URL || process.env.TEST_SUPABASE_SERVICE_ROLE_KEY);
const supabaseUrl = process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const requiredEnv = isTestRuntime
  ? ['TEST_SUPABASE_URL', 'TEST_SUPABASE_SERVICE_ROLE_KEY']
  : ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SITE_URL'];

function fail(message) {
  console.error(`[runtime-check] FAIL: ${message}`);
  process.exitCode = 1;
}

function ok(message) {
  console.log(`[runtime-check] OK: ${message}`);
}

for (const key of requiredEnv) {
  if (!process.env[key]?.trim()) {
    fail(`Missing env var ${key}`);
  }
}

if (process.exitCode) process.exit();

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

ok('required env vars are present');

const { data: contract, error: contractError } = await supabase.rpc('validate_runtime_contract').single();

if (contractError) {
  fail(`validate_runtime_contract failed: ${contractError.message}`);
} else if (!contract?.ok) {
  fail(`runtime contract incomplete: ${JSON.stringify(contract)}`);
} else {
  ok('runtime contract is valid');
}

const bucketName = process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || 'product-images';
const { data: bucket, error: bucketError } = await supabase.storage.getBucket(bucketName);

if (bucketError || !bucket) {
  fail(`Storage bucket not available: ${bucketName}`);
} else {
  ok(`storage bucket is available: ${bucketName}`);
}

if (!process.exitCode) {
  ok('runtime readiness checks passed');
}
