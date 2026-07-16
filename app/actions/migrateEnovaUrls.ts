'use server';

import { migrateEnovaUrls, type EnovaUrlMigrationResult } from '@/lib/services/enovaUrlMigration';

export type MigrateEnovaUrlsResult = {
  success: boolean;
  result?: EnovaUrlMigrationResult;
  error?: string;
};

export async function migrateEnovaUrlsAction(): Promise<MigrateEnovaUrlsResult> {
  try {
    const result = await migrateEnovaUrls();
    return {
      success: true,
      result,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al migrar URLs de Enova',
    };
  }
}
