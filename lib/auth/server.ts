import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getOptionalSupabaseClientEnv } from '@/env/client';
import { canAccessAdmin, type AppRole } from '@/lib/auth/permissions';

interface ProfileAuthorizationRow {
  role: AppRole;
  is_active: boolean;
}

export interface AdminUserContext {
  userId: string;
  role: AppRole;
}

export async function getAdminUserContext(allowRole: (role: AppRole) => boolean = canAccessAdmin): Promise<AdminUserContext | null> {
  const env = getOptionalSupabaseClientEnv();

  if (!env) {
    return null;
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Route handlers only need to validate the current session here.
      },
    },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError) {
    return null;
  }

  const profile = data as ProfileAuthorizationRow | null;

  if (!profile?.is_active || !allowRole(profile.role)) {
    return null;
  }

  return {
    userId: user.id,
    role: profile.role,
  };
}

async function authorizeUser(allowRole: (role: AppRole) => boolean): Promise<NextResponse | null> {
  const env = getOptionalSupabaseClientEnv();

  if (!env) {
    return NextResponse.json({ message: 'Supabase Auth no está configurado' }, { status: 503 });
  }

  const adminUser = await getAdminUserContext(allowRole);

  if (!adminUser) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  return null;
}

export async function requireAdminUser(): Promise<NextResponse | null> {
  return authorizeUser(canAccessAdmin);
}

export async function requireStrictAdminUser(): Promise<NextResponse | null> {
  return authorizeUser((role) => role === 'ADMIN');
}
