const REQUIRED_SERVER_ENV = ['SUPABASE_SERVICE_ROLE_KEY'] as const;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function requireEnv(name: string): string {
  const value = readEnv(name);

  if (!value) {
    throw new Error(`Missing required server environment variable: ${name}`);
  }

  return value;
}

function getSupabaseUrl(): string {
  const value = readEnv('NEXT_PUBLIC_SUPABASE_URL') ?? readEnv('SUPABASE_URL');

  if (!value) {
    throw new Error('Missing required Supabase URL: set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  }

  return value;
}

export function getServerEnv() {
  return {
    supabaseUrl: getSupabaseUrl(),
    supabaseServiceRoleKey: requireEnv(REQUIRED_SERVER_ENV[0]),
    productImagesBucket: readEnv('SUPABASE_PRODUCT_IMAGES_BUCKET') ?? 'product-images',
  };
}

export function getOptionalServerEnv() {
  try {
    return getServerEnv();
  } catch {
    return null;
  }
}
