import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase browser environment variables are missing');
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export function getSupabaseBrowserClient() {
  try {
    return createSupabaseBrowserClient();
  } catch {
    return null;
  }
}
