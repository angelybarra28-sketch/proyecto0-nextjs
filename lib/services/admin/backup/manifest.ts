import { BACKUP_VERSION } from './types';
import type { BackupManifest } from './types';

export function buildManifest(
  tables: string[],
  rowCounts: Record<string, number>,
  projectUrl: string,
  appVersion: string,
): BackupManifest {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    projectUrl,
    tables,
    rowCounts,
    appVersion,
  };
}
