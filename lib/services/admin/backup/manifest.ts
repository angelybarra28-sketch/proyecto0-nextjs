import type { BackupManifest } from './types';

export function buildManifest(
  tables: string[],
  rowCounts: Record<string, number>,
  projectUrl: string,
  appVersion: string,
): BackupManifest {
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    projectUrl,
    tables,
    rowCounts,
    appVersion,
  };
}
