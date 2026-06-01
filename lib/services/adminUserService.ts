import { listUsersWithProfiles } from '@/lib/repositories/userRepository';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import type { AdminUserView } from '@/lib/types';
import type { AdminUserContext } from '@/lib/auth/server';

function mapToAdminUserView(authUser: {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    phone?: string;
    address?: string;
    dni?: string;
  };
  created_at: string;
}, profile: {
  user_id: string;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER';
  full_name: string | null;
  is_active: boolean;
  created_at: string;
} | null | undefined): AdminUserView {
  return {
    id: authUser.id,
    email: authUser.email,
    nombreApellido: profile?.full_name ?? authUser.user_metadata.full_name ?? 'Usuario sin perfil',
    telefono: authUser.user_metadata.phone ?? '',
    domicilio: authUser.user_metadata.address ?? '',
    dni: authUser.user_metadata.dni ?? '',
    role: profile?.role ?? 'CUSTOMER',
    isActive: profile?.is_active ?? true,
    createdAt: authUser.created_at,
    hasProfile: !!profile,
  };
}

export async function listAdminUsers(options?: { page: number; limit: number }): Promise<{ users: AdminUserView[]; total?: number }> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  const { authUsers, profiles, total } = await listUsersWithProfiles(
    supabase,
    options ? { page: options.page, perPage: options.limit } : undefined
  );

  const profileByUserId = new Map<string, typeof profiles[number]>();
  for (const profile of profiles) {
    profileByUserId.set(profile.user_id, profile);
  }

  const users = authUsers.map((authUser) => {
    const profile = profileByUserId.get(authUser.id);
    return mapToAdminUserView(authUser, profile);
  });

  return { users, total };
}

export async function toggleUserStatus(
  adminUser: AdminUserContext,
  targetUserId: string,
  isActive: boolean
): Promise<{ previousIsActive: boolean; newIsActive: boolean }> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  if (targetUserId === adminUser.userId) {
    throw new Error('SELF_DEACTIVATION');
  }

  const { data, error } = await supabase.rpc('toggle_user_active_atomic', {
    p_target_user_id: targetUserId,
    p_is_active: isActive,
  });

  if (error) {
    const msg = error.message ?? '';
    if (msg.includes('SELF_DEACTIVATION')) {
      throw new Error('SELF_DEACTIVATION');
    }
    if (msg.includes('LAST_ADMIN')) {
      throw new Error('LAST_ADMIN');
    }
    if (msg.includes('USER_NOT_FOUND')) {
      throw new Error('USER_NOT_FOUND');
    }
    if (msg.includes('PROFILE_UPDATE_NO_ROWS')) {
      throw new Error('PROFILE_UPDATE_NO_ROWS');
    }
    throw error;
  }

  const result = data as { previous_is_active: boolean; new_is_active: boolean } | null;
  if (!result) {
    throw new Error('USER_NOT_FOUND');
  }

  return {
    previousIsActive: result.previous_is_active,
    newIsActive: result.new_is_active,
  };
}
