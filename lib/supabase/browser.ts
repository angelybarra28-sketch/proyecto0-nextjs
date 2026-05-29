import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseClientEnv } from '@/env/client';

let cachedBrowserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  try {
    if (!cachedBrowserClient) {
      const env = getSupabaseClientEnv();
      cachedBrowserClient = createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
    }
    return cachedBrowserClient;
  } catch (error) {
    console.error('SUPABASE BROWSER ERROR:', error);
    return null;
  }
}
