export function getClientEnv() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL!,
  };
}

export function getSupabaseClientEnv() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  };
}

export function getOptionalClientEnv() {
  try {
    return getClientEnv();
  } catch {
    return null;
  }
}

export function getOptionalSupabaseClientEnv() {
  try {
    return getSupabaseClientEnv();
  } catch {
    return null;
  }
}

export function getMetadataBaseUrl(): URL | undefined {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    return undefined;
  }

  return new URL(siteUrl);
}