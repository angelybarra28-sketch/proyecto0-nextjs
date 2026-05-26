import type { SupabaseClient } from '@supabase/supabase-js';

export type RuntimeContractStatus = {
  ok: boolean;
  missingTables: string[];
  missingColumns: string[];
  missingFunctions: string[];
  missingExtensions: string[];
};

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export async function validateRuntimeContract(supabase: SupabaseClient): Promise<RuntimeContractStatus> {
  const { data, error } = await supabase.rpc('validate_runtime_contract').single();

  if (error) {
    throw error;
  }

  const row = data as Record<string, unknown>;

  return {
    ok: row.ok === true,
    missingTables: toStringArray(row.missingTables),
    missingColumns: toStringArray(row.missingColumns),
    missingFunctions: toStringArray(row.missingFunctions),
    missingExtensions: toStringArray(row.missingExtensions),
  };
}
