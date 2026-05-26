import { createClient } from '@supabase/supabase-js';

const url = process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321';
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('[setup-local-test-env] Missing TEST_SUPABASE_SERVICE_ROLE_KEY. Use the service_role key printed by `supabase start`.');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await supabase.storage.getBucket('product-images');

if (!error && data) {
  console.log('[setup-local-test-env] Bucket already exists: product-images');
  process.exit(0);
}

const { error: createError } = await supabase.storage.createBucket('product-images', {
  public: true,
  fileSizeLimit: 10 * 1024 * 1024,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
});

if (createError) {
  console.error(`[setup-local-test-env] Failed to create bucket: ${createError.message}`);
  process.exit(1);
}

console.log('[setup-local-test-env] Bucket created: product-images');
