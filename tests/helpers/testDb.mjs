import { createClient } from '@supabase/supabase-js';

export function hasTestDbEnv() {
  return Boolean(process.env.TEST_SUPABASE_SERVICE_ROLE_KEY);
}

export function createTestDbClient() {
  if (!hasTestDbEnv()) {
    throw new Error('Missing TEST_SUPABASE_SERVICE_ROLE_KEY. Start Supabase local and export the local service_role key.');
  }

  return createClient(process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321', process.env.TEST_SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createRunId(prefix = 'dbtest') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function assertRuntimeReady(supabase) {
  const { data, error } = await supabase.rpc('validate_runtime_contract').single();

  if (error) {
    throw new Error(`validate_runtime_contract failed: ${error.message}`);
  }

  if (!data?.ok) {
    throw new Error(`Runtime contract is incomplete: ${JSON.stringify(data)}`);
  }
}

export async function expectRpcError(promise, expectedMessage) {
  const { error } = await promise;

  if (!error) {
    throw new Error(`Expected RPC error containing "${expectedMessage}"`);
  }

  if (!error.message.includes(expectedMessage)) {
    throw new Error(`Expected RPC error containing "${expectedMessage}", got "${error.message}"`);
  }
}
