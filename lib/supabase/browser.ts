import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseClientEnv } from '@/env/client';

export function createSupabaseBrowserClient() {
  const env = getSupabaseClientEnv();

  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}

export function getSupabaseBrowserClient() {
  try {
    return createSupabaseBrowserClient();
  } catch {
    return null;
  }
}
