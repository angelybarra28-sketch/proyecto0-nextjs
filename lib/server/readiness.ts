import { randomUUID } from 'crypto';
import { getOptionalClientEnv } from '@/env/client';
import { getOptionalServerEnv } from '@/env/server';
import { validateRuntimeContract } from '@/lib/repositories/runtimeContractRepository';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export type ReadinessCheck = {
  name: string;
  success: boolean;
  durationMs: number;
  message?: string;
  details?: unknown;
};

async function runCheck(name: string, check: () => Promise<Omit<ReadinessCheck, 'name' | 'durationMs'>>): Promise<ReadinessCheck> {
  const startedAt = performance.now();

  try {
    const result = await check();
    return { name, durationMs: Math.round(performance.now() - startedAt), ...result };
  } catch (error) {
    return {
      name,
      success: false,
      durationMs: Math.round(performance.now() - startedAt),
      message: error instanceof Error ? error.message : 'unknown error',
    };
  }
}

export async function runReadinessChecks(): Promise<ReadinessCheck[]> {
  const serverEnv = getOptionalServerEnv();
  const clientEnv = getOptionalClientEnv();
  const supabase = getSupabaseAdminClient();

  return Promise.all([
    runCheck('environment', async () => ({
      success: Boolean(serverEnv && clientEnv),
      message: serverEnv && clientEnv ? 'env ok' : 'missing required env vars',
    })),
    runCheck('supabase', async () => {
      if (!supabase) return { success: false, message: 'Supabase admin client unavailable' };
      const { error } = await supabase.from('profiles').select('user_id', { count: 'exact', head: true });
      return { success: !error, message: error?.message ?? 'reachable' };
    }),
    runCheck('runtime_contract', async () => {
      if (!supabase) return { success: false, message: 'Supabase admin client unavailable' };
      const status = await validateRuntimeContract(supabase);
      return { success: status.ok, details: status, message: status.ok ? 'contract ok' : 'contract incomplete' };
    }),
    runCheck('storage_bucket', async () => {
      if (!supabase || !serverEnv) return { success: false, message: 'Supabase admin client unavailable' };
      const { data, error } = await supabase.storage.getBucket(serverEnv.productImagesBucket);
      return { success: Boolean(data && !error), message: error?.message ?? `bucket ${serverEnv.productImagesBucket} ok` };
    }),
  ]);
}

export async function runRecoveryReadinessChecks(): Promise<ReadinessCheck[]> {
  const serverEnv = getOptionalServerEnv();
  const supabase = getSupabaseAdminClient();

  return Promise.all([
    runCheck('db_writable', async () => {
      if (!supabase) return { success: false, message: 'Supabase admin client unavailable' };

      const { data, error } = await supabase
        .from('admin_audit_logs')
        .insert({
          action: 'recovery_readiness_check',
          entity: 'system',
          entity_id: null,
          metadata: { source: '/api/ready/recovery' },
        })
        .select('id')
        .single();

      if (error) return { success: false, message: error.message };

      if (data?.id) {
        const { error: deleteError } = await supabase.from('admin_audit_logs').delete().eq('id', data.id);
        if (deleteError) return { success: false, message: deleteError.message };
      }

      return { success: true, message: 'database writes ok' };
    }),
    runCheck('storage_writable', async () => {
      if (!supabase || !serverEnv) return { success: false, message: 'Supabase admin client unavailable' };

      const path = `recovery-checks/${randomUUID()}.txt`;
      const { error } = await supabase.storage
        .from(serverEnv.productImagesBucket)
        .upload(path, new Blob(['ok'], { type: 'text/plain' }), { upsert: false, contentType: 'text/plain' });

      if (error) return { success: false, message: error.message };

      const { error: deleteError } = await supabase.storage.from(serverEnv.productImagesBucket).remove([path]);
      if (deleteError) return { success: false, message: deleteError.message };

      return { success: true, message: 'storage writes ok' };
    }),
    runCheck('critical_rpcs', async () => {
      if (!supabase) return { success: false, message: 'Supabase admin client unavailable' };
      const status = await validateRuntimeContract(supabase);
      return {
        success: status.missingFunctions.length === 0,
        message: status.missingFunctions.length === 0 ? 'critical RPCs available' : 'RUNTIME_CONTRACT_INVALID',
        details: { missingFunctions: status.missingFunctions },
      };
    }),
    runCheck('runtime_contract', async () => {
      if (!supabase) return { success: false, message: 'Supabase admin client unavailable' };
      const status = await validateRuntimeContract(supabase);
      return { success: status.ok, details: status, message: status.ok ? 'contract ok' : 'RUNTIME_CONTRACT_INVALID' };
    }),
  ]);
}
