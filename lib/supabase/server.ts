import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getOptionalServerEnv } from '@/env/server';

let cachedClient: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient | null {
  const env = getOptionalServerEnv();

  if (!env) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return cachedClient;
}
