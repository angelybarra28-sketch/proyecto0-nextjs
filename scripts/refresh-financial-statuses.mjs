import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[refresh-financial-statuses] Missing Supabase server env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await supabase.rpc('refresh_financial_statuses');

if (error) {
  console.error(`[refresh-financial-statuses] Failed: ${error.message}`);
  process.exit(1);
}

console.log('[refresh-financial-statuses] Completed:', JSON.stringify(data));
