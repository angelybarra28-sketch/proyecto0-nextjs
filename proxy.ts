import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { canAccessAdmin, type AppRole } from '@/lib/auth/permissions';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isAdminPath = request.nextUrl.pathname.startsWith('/admin');
  const isAdminApi = request.nextUrl.pathname.startsWith('/api/admin');

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isAdminApi) {
      return NextResponse.json({ message: 'Supabase Auth no está configurado' }, { status: 503 });
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth';
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!isAdminPath && !isAdminApi) {
    return response;
  }

  if (!user) {
    if (isAdminApi) {
      return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth';
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .maybeSingle();

  const role = (profile?.role ?? null) as AppRole | null;
  const isActive = profile?.is_active === true;

  if (!isActive || !canAccessAdmin(role)) {
    if (isAdminApi) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/';
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
