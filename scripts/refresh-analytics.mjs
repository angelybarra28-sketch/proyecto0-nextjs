import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[analytics-refresh] FAIL: Missing Supabase URL or service-role key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await supabase.rpc('get_admin_dashboard_analytics').single();

if (error) {
  console.error(`[analytics-refresh] FAIL: ${error.message}`);
  process.exit(1);
}

console.log(JSON.stringify(data, null, 2));
console.log('[analytics-refresh] OK: analytics RPC executed');
