import type { SupabaseClient } from '@supabase/supabase-js';

export interface UserAuthRow {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    phone?: string;
    address?: string;
    dni?: string;
  };
  created_at: string;
}

export interface UserProfileRow {
  user_id: string;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER';
  full_name: string | null;
  is_active: boolean;
  created_at: string;
}

export async function listUsersWithProfiles(
  supabase: SupabaseClient
): Promise<{ authUsers: UserAuthRow[]; profiles: UserProfileRow[] }> {
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  });

  if (authError) {
    throw authError;
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, role, full_name, is_active, created_at');

  if (profileError) {
    throw profileError;
  }

  const authUsers = (authData?.users ?? []).map((user) => ({
    id: user.id,
    email: user.email ?? '',
    user_metadata: (user.user_metadata ?? {}) as UserAuthRow['user_metadata'],
    created_at: user.created_at,
  }));

  const profiles = (profileData ?? []) as UserProfileRow[];

  return { authUsers, profiles };
}

export async function updateUserActiveStatus(
  supabase: SupabaseClient,
  userId: string,
  isActive: boolean
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}
