import { validateRuntimeContract, type RuntimeContractStatus } from '@/lib/repositories/runtimeContractRepository';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

let cachedStatus: RuntimeContractStatus | null = null;

export async function assertRuntimeContract(context: string): Promise<void> {
  if (cachedStatus?.ok) {
    return;
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error(`Supabase no está configurado para ${context}`);
  }

  try {
    cachedStatus = await validateRuntimeContract(supabase);
  } catch (error) {
    throw new Error(`No se pudo validar el contrato de base de datos para ${context}: ${error instanceof Error ? error.message : 'error desconocido'}`);
  }

  if (!cachedStatus.ok) {
    throw new Error(
      `Contrato de base de datos incompleto para ${context}. ` +
      `Tablas faltantes: ${cachedStatus.missingTables.join(', ') || 'ninguna'}. ` +
      `Columnas faltantes: ${cachedStatus.missingColumns.join(', ') || 'ninguna'}. ` +
      `RPCs faltantes: ${cachedStatus.missingFunctions.join(', ') || 'ninguna'}.`
    );
  }
}
