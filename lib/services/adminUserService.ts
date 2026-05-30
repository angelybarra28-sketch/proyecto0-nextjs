import { listUsersWithProfiles, updateUserActiveStatus } from '@/lib/repositories/userRepository';
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
}): AdminUserView {
  return {
    id: authUser.id,
    email: authUser.email,
    nombreApellido: profile.full_name ?? authUser.user_metadata.full_name ?? 'Usuario',
    telefono: authUser.user_metadata.phone ?? '',
    domicilio: authUser.user_metadata.address ?? '',
    dni: authUser.user_metadata.dni ?? '',
    role: profile.role,
    isActive: profile.is_active,
    createdAt: authUser.created_at,
  };
}

export async function listAdminUsers(): Promise<AdminUserView[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  const { authUsers, profiles } = await listUsersWithProfiles(supabase);

  const profileByUserId = new Map<string, typeof profiles[number]>();
  for (const profile of profiles) {
    profileByUserId.set(profile.user_id, profile);
  }

  return authUsers
    .map((authUser) => {
      const profile = profileByUserId.get(authUser.id);
      if (!profile) return null;
      return mapToAdminUserView(authUser, profile);
    })
    .filter((user): user is AdminUserView => user !== null);
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

  const { data: targetProfile, error: targetError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('user_id', targetUserId)
    .maybeSingle();

  if (targetError || !targetProfile) {
    throw new Error('USER_NOT_FOUND');
  }

  const previousIsActive = targetProfile.is_active as boolean;

  if (!isActive && targetProfile.role === 'ADMIN') {
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'ADMIN')
      .eq('is_active', true);

    if (countError) {
      throw countError;
    }

    if ((count ?? 0) <= 1) {
      throw new Error('LAST_ADMIN');
    }
  }

  await updateUserActiveStatus(supabase, targetUserId, isActive);

  return { previousIsActive, newIsActive: isActive };
}
