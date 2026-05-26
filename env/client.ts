function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function requireEnv(name: string): string {
  const value = readEnv(name);

  if (!value) {
    throw new Error(`Missing required client environment variable: ${name}`);
  }

  return value;
}

export function getClientEnv() {
  return {
    supabaseUrl: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    siteUrl: requireEnv('NEXT_PUBLIC_SITE_URL'),
  };
}

export function getSupabaseClientEnv() {
  return {
    supabaseUrl: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
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
  const siteUrl = readEnv('NEXT_PUBLIC_SITE_URL');

  if (!siteUrl) {
    return undefined;
  }

  return new URL(siteUrl);
}
