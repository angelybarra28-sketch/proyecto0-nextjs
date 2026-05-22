import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { canAccessAdmin, type AppRole } from '@/lib/auth/permissions';

interface ProfileAuthorizationRow {
  role: AppRole;
  is_active: boolean;
}

export async function requireAdminUser(): Promise<NextResponse | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ message: 'Supabase Auth no está configurado' }, { status: 503 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const { data, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ message: 'No se pudo validar el perfil' }, { status: 500 });
  }

  const profile = data as ProfileAuthorizationRow | null;

  if (!profile?.is_active || !canAccessAdmin(profile.role)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  return null;
}
