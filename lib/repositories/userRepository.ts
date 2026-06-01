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
  supabase: SupabaseClient,
  options?: { page: number; perPage: number }
): Promise<{ authUsers: UserAuthRow[]; profiles: UserProfileRow[]; total?: number }> {
  if (options) {
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      perPage: options.perPage,
      page: options.page,
    });

    if (authError) {
      throw authError;
    }

    const authUsers = (authData?.users ?? []).map((user) => ({
      id: user.id,
      email: user.email ?? '',
      user_metadata: (user.user_metadata ?? {}) as UserAuthRow['user_metadata'],
      created_at: user.created_at,
    }));

    const userIds = authUsers.map((u) => u.id);

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, role, full_name, is_active, created_at')
      .in('user_id', userIds);

    if (profileError) {
      throw profileError;
    }

    const profiles = (profileData ?? []) as UserProfileRow[];

    return { authUsers, profiles, total: authData?.total ?? undefined };
  }

  // Legacy: iterate all pages
  const allAuthUsers: UserAuthRow[] = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      perPage,
      page,
    });

    if (authError) {
      throw authError;
    }

    const pageUsers = (authData?.users ?? []).map((user) => ({
      id: user.id,
      email: user.email ?? '',
      user_metadata: (user.user_metadata ?? {}) as UserAuthRow['user_metadata'],
      created_at: user.created_at,
    }));

    allAuthUsers.push(...pageUsers);

    if (pageUsers.length < perPage) {
      break;
    }

    page++;
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, role, full_name, is_active, created_at');

  if (profileError) {
    throw profileError;
  }

  const profiles = (profileData ?? []) as UserProfileRow[];

  return { authUsers: allAuthUsers, profiles };
}
