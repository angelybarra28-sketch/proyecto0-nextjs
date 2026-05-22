import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { AppRole, AuthProfile } from '@/lib/auth/permissions';

interface ProfileRow {
  user_id: string;
  role: AppRole;
  full_name: string | null;
  is_active: boolean;
}

export async function getCurrentAuthProfile(): Promise<AuthProfile | null> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, role, full_name, is_active')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const profile = data as ProfileRow | null;

  return {
    userId: user.id,
    role: profile?.role ?? 'CUSTOMER',
    fullName: profile?.full_name ?? user.email ?? null,
    isActive: profile?.is_active ?? true,
  };
}
